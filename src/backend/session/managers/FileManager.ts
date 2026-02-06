/**
 * FileManager
 *
 * Manages files (folders/dates) - the single source of truth for the folder list.
 * Handles syncing with R2 dates and maintaining denormalized counts.
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import {
  getFiles,
  getOrCreateFile,
  updateFile,
  bulkCreateFiles,
  incrementNoteCount,
  updateFileTranscript,
  getAvailableDates,
  deleteFile as deleteFileFromDb,
  type FileI,
} from "../../models";

// =============================================================================
// Types
// =============================================================================

export interface FileData {
  id: string;
  date: string;
  noteCount: number;
  transcriptSegmentCount: number;
  hasTranscript: boolean;
  hasNotes: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  r2Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FileFilter = "all" | "archived" | "trash";

// =============================================================================
// Manager
// =============================================================================

export class FileManager extends SyncedManager {
  @synced files = synced<FileData[]>([]);
  @synced isLoading = false;
  @synced activeFilter: FileFilter = "all";

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    this.isLoading = true;
    console.log(`[FileManager] Starting hydration for ${userId}`);

    try {
      // Step 1: Load existing File records from MongoDB
      const dbFiles = await getFiles(userId, {
        isTrashed: false,
        isArchived: false,
      });
      const existingDates = new Set(dbFiles.map((f) => f.date));
      console.log(`[FileManager] Found ${dbFiles.length} existing File records in MongoDB`);
      console.log(`[FileManager] Existing File dates:`, Array.from(existingDates));

      // Step 2: Get R2 available dates (for historical transcripts)
      const r2Manager = (this._session as any)?.r2;
      let r2Dates: string[] = [];
      if (r2Manager) {
        r2Dates = await r2Manager.loadR2AvailableDates();
        console.log(`[FileManager] R2 transcript dates (${r2Dates.length}):`, r2Dates);
      } else {
        console.log(`[FileManager] No R2 manager available`);
      }

      // Step 3: Get MongoDB transcript dates (DailyTranscript collection)
      let mongoDbDates: string[] = [];
      mongoDbDates = await getAvailableDates(userId);
      console.log(`[FileManager] MongoDB DailyTranscript dates (${mongoDbDates.length}):`, mongoDbDates);

      // Step 4: Find dates that need File records created
      const allDates = new Set([...r2Dates, ...mongoDbDates]);
      const missingDates = Array.from(allDates).filter(
        (d) => !existingDates.has(d),
      );
      console.log(`[FileManager] Combined unique dates: ${allDates.size}`);
      console.log(`[FileManager] Missing File records to create: ${missingDates.length}`, missingDates);

      // Step 5: Bulk create missing File records
      if (missingDates.length > 0) {
        console.log(`[FileManager] Creating ${missingDates.length} new File records...`);
        await bulkCreateFiles(userId, missingDates);

        // Mark R2 dates as having transcripts
        for (const date of missingDates) {
          if (r2Dates.includes(date)) {
            console.log(`[FileManager] Marking ${date} as R2 transcript`);
            await updateFileTranscript(userId, date, {
              r2Key: `transcripts/${userId}/${date}.json`,
            });
          } else if (mongoDbDates.includes(date)) {
            console.log(`[FileManager] Marking ${date} as MongoDB transcript`);
            await updateFileTranscript(userId, date, {});
          }
        }
      }

      // Step 6: Reload all files and set state
      const allFiles = await getFiles(userId, {
        isTrashed: false,
        isArchived: false,
      });

      this.files.set(allFiles.map((f) => this.toFileData(f)));

      console.log(`[FileManager] ✓ Hydration complete: ${allFiles.length} files for ${userId}`);
      console.log(`[FileManager] Final files:`, allFiles.map(f => ({ date: f.date, hasTranscript: f.hasTranscript, r2Key: f.r2Key, noteCount: f.noteCount })));
    } catch (error) {
      console.error("[FileManager] Failed to hydrate:", error);
    } finally {
      this.isLoading = false;
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private toFileData(file: FileI): FileData {
    return {
      id: file._id?.toString() || file.date,
      date: file.date,
      noteCount: file.noteCount,
      transcriptSegmentCount: file.transcriptSegmentCount,
      hasTranscript: file.hasTranscript,
      hasNotes: file.hasNotes,
      isArchived: file.isArchived,
      isTrashed: file.isTrashed,
      r2Key: file.r2Key,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  // ===========================================================================
  // Public Methods (called by other managers)
  // ===========================================================================

  /**
   * Called by NotesManager when a note is created
   */
  async onNoteCreated(noteDate: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    await incrementNoteCount(userId, noteDate, 1);

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === noteDate);
      if (idx >= 0) {
        files[idx].noteCount++;
        files[idx].hasNotes = true;
      } else {
        // File doesn't exist locally, refresh it
        this.refreshFile(noteDate);
      }
    });
  }

  /**
   * Called by NotesManager when a note is deleted
   */
  async onNoteDeleted(noteDate: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    await incrementNoteCount(userId, noteDate, -1);

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === noteDate);
      if (idx >= 0) {
        files[idx].noteCount = Math.max(0, files[idx].noteCount - 1);
        files[idx].hasNotes = files[idx].noteCount > 0;
      }
    });
  }

  /**
   * Called by TranscriptManager when transcript recording starts
   */
  async onTranscriptStarted(date: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    await getOrCreateFile(userId, date, { hasTranscript: true });

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].hasTranscript = true;
      } else {
        this.refreshFile(date);
      }
    });
  }

  /**
   * Called by R2Manager after batch upload
   */
  async onTranscriptArchived(
    date: string,
    r2Key: string,
    segmentCount: number,
  ): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    await updateFileTranscript(userId, date, { r2Key, segmentCount });

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].r2Key = r2Key;
        files[idx].transcriptSegmentCount = segmentCount;
        files[idx].hasTranscript = true;
      }
    });
  }

  /**
   * Refresh a single file from DB
   */
  private async refreshFile(date: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    const file = await getOrCreateFile(userId, date);
    const fileData = this.toFileData(file);

    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx] = fileData;
      } else {
        files.push(fileData);
        files.sort((a, b) => b.date.localeCompare(a.date));
      }
    });
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  @rpc
  async getFilesRpc(filter?: FileFilter): Promise<FileData[]> {
    const userId = this._session?.userId;
    if (!userId) return [];

    const filterOptions: { isArchived?: boolean; isTrashed?: boolean } = {};

    switch (filter || this.activeFilter) {
      case "archived":
        filterOptions.isArchived = true;
        filterOptions.isTrashed = false;
        break;
      case "trash":
        filterOptions.isTrashed = true;
        break;
      default: // "all"
        filterOptions.isArchived = false;
        filterOptions.isTrashed = false;
    }

    const files = await getFiles(userId, filterOptions);
    return files.map((f) => this.toFileData(f));
  }

  @rpc
  async setFilter(filter: FileFilter): Promise<FileData[]> {
    this.activeFilter = filter;
    const files = await this.getFilesRpc(filter);
    this.files.set(files);
    return files;
  }

  @rpc
  async archiveFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    const file = await updateFile(userId, date, { isArchived: true });
    if (!file) return null;

    // Remove from local state (if viewing non-archived)
    if (this.activeFilter !== "archived") {
      this.files.set(this.files.filter((f) => f.date !== date));
    }

    return this.toFileData(file);
  }

  @rpc
  async unarchiveFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    const file = await updateFile(userId, date, { isArchived: false });
    if (!file) return null;

    // Refresh the list based on current filter
    const files = await this.getFilesRpc(this.activeFilter);
    this.files.set(files);

    return this.toFileData(file);
  }

  @rpc
  async trashFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    const file = await updateFile(userId, date, { isTrashed: true });
    if (!file) return null;

    // Remove from local state (if not viewing trash)
    if (this.activeFilter !== "trash") {
      this.files.set(this.files.filter((f) => f.date !== date));
    }

    return this.toFileData(file);
  }

  @rpc
  async restoreFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    const file = await updateFile(userId, date, { isTrashed: false });
    if (!file) return null;

    // Refresh the list
    const files = await this.getFilesRpc(this.activeFilter);
    this.files.set(files);

    return this.toFileData(file);
  }

  @rpc
  async permanentlyDeleteFile(date: string): Promise<boolean> {
    const userId = this._session?.userId;
    if (!userId) return false;

    const success = await deleteFileFromDb(userId, date, true);

    if (success) {
      this.files.set(this.files.filter((f) => f.date !== date));
    }

    return success;
  }
}
