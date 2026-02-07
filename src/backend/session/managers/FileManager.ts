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
  deleteDailyTranscript,
  deleteNotesByDate,
  deleteChatHistory,
  type FileI,
} from "../../models";
import { deleteFromR2 } from "../../services/r2Upload.service";

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
  isFavourite: boolean;
  r2Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FileFilter = "all" | "archived" | "trash" | "favourites";

export interface FileCounts {
  all: number;
  archived: number;
  trash: number;
  favourites: number;
}

// =============================================================================
// Manager
// =============================================================================

export class FileManager extends SyncedManager {
  @synced files = synced<FileData[]>([]);
  @synced isLoading = false;
  @synced activeFilter: FileFilter = "all";
  @synced counts: FileCounts = { all: 0, archived: 0, trash: 0, favourites: 0 };

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

      // Step 4: Always include today's date (so File record exists for current day)
      const today = this.getTodayDate();
      console.log(`[FileManager] Today's date: ${today}`);

      // Step 5: Find dates that need File records created
      const allDates = new Set([...r2Dates, ...mongoDbDates, today]);
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

      // Step 6: Clean up orphaned File records (no transcript data and no notes)
      const orphanedDates = Array.from(existingDates).filter((d) => {
        // Keep if it has transcript data in R2 or MongoDB
        if (allDates.has(d)) return false;
        // Keep if it has notes
        const file = dbFiles.find((f) => f.date === d);
        if (file && file.noteCount > 0) return false;
        // Otherwise it's orphaned
        return true;
      });

      if (orphanedDates.length > 0) {
        console.log(`[FileManager] Cleaning up ${orphanedDates.length} orphaned File records:`, orphanedDates);
        for (const date of orphanedDates) {
          await deleteFileFromDb(userId, date, true);
        }
      }

      // Step 7: Reload all files and set state
      const allFiles = await getFiles(userId, {
        isTrashed: false,
        isArchived: false,
      });

      this.files.set(allFiles.map((f) => this.toFileData(f)));

      // Update counts
      await this.refreshCounts();

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

  private getTodayDate(): string {
    // Get today's date from TranscriptManager's TimeManager if available
    const transcriptManager = (this._session as any)?.transcript;
    if (transcriptManager?.getTimeManager) {
      return transcriptManager.getTimeManager().getTodayDate();
    }
    // Fallback: compute today's date in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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
      isFavourite: file.isFavourite,
      r2Key: file.r2Key,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  /**
   * Refresh counts for all filter categories
   */
  private async refreshCounts(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    const [allFiles, archivedFiles, trashedFiles, favouriteFiles] = await Promise.all([
      getFiles(userId, { isArchived: false, isTrashed: false }),
      getFiles(userId, { isArchived: true, isTrashed: false }),
      getFiles(userId, { isTrashed: true }),
      getFiles(userId, { isFavourite: true, isTrashed: false }),
    ]);

    this.counts = {
      all: allFiles.length,
      archived: archivedFiles.length,
      trash: trashedFiles.length,
      favourites: favouriteFiles.length,
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

  /**
   * Force refresh files from database (useful after direct DB changes)
   */
  @rpc
  async refreshFiles(): Promise<FileData[]> {
    await this.hydrate();
    return [...this.files];
  }

  @rpc
  async getFilesRpc(filter?: FileFilter): Promise<FileData[]> {
    const userId = this._session?.userId;
    if (!userId) return [];

    const filterOptions: {
      isArchived?: boolean;
      isTrashed?: boolean;
      isFavourite?: boolean;
    } = {};

    switch (filter || this.activeFilter) {
      case "archived":
        filterOptions.isArchived = true;
        filterOptions.isTrashed = false;
        break;
      case "trash":
        filterOptions.isTrashed = true;
        break;
      case "favourites":
        filterOptions.isFavourite = true;
        filterOptions.isTrashed = false;
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

    // Mutually exclusive: clear favourite and trash when archiving
    const file = await updateFile(userId, date, {
      isArchived: true,
      isFavourite: false,
      isTrashed: false,
    });
    if (!file) return null;

    // Update local state - update the file in place so DayPage can see the change
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].isArchived = true;
        files[idx].isFavourite = false;
        files[idx].isTrashed = false;
      }
    });

    // Update counts
    await this.refreshCounts();

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

    // Update counts
    await this.refreshCounts();

    return this.toFileData(file);
  }

  @rpc
  async trashFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    // Mutually exclusive: clear favourite and archive when trashing
    const file = await updateFile(userId, date, {
      isTrashed: true,
      isFavourite: false,
      isArchived: false,
    });
    if (!file) return null;

    // Update local state - update the file in place so DayPage can see the change
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].isTrashed = true;
        files[idx].isFavourite = false;
        files[idx].isArchived = false;
      }
    });

    // Update counts
    await this.refreshCounts();

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

    // Update counts
    await this.refreshCounts();

    return this.toFileData(file);
  }

  @rpc
  async favouriteFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    // Mutually exclusive: clear archive and trash when favouriting
    const file = await updateFile(userId, date, {
      isFavourite: true,
      isArchived: false,
      isTrashed: false,
    });
    if (!file) return null;

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].isFavourite = true;
        files[idx].isArchived = false;
        files[idx].isTrashed = false;
      }
    });

    // Update counts
    await this.refreshCounts();

    return this.toFileData(file);
  }

  @rpc
  async unfavouriteFile(date: string): Promise<FileData | null> {
    const userId = this._session?.userId;
    if (!userId) return null;

    const file = await updateFile(userId, date, { isFavourite: false });
    if (!file) return null;

    // Update local state
    this.files.mutate((files) => {
      const idx = files.findIndex((f) => f.date === date);
      if (idx >= 0) {
        files[idx].isFavourite = false;
      }
    });

    // Update counts
    await this.refreshCounts();

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

  /**
   * Fully purge a date - deletes both DailyTranscript AND File records
   * Use this when you want to completely remove a date from the system
   * Note: This does NOT delete from R2 (cloud storage)
   */
  @rpc
  async purgeDate(date: string): Promise<{ deletedTranscript: boolean; deletedFile: boolean }> {
    const userId = this._session?.userId;
    if (!userId) {
      return { deletedTranscript: false, deletedFile: false };
    }

    console.log(`[FileManager] Purging date ${date} for user ${userId}`);

    // Delete DailyTranscript record
    const deletedTranscript = await deleteDailyTranscript(userId, date);
    console.log(`[FileManager] DailyTranscript deleted: ${deletedTranscript}`);

    // Delete File record
    const deletedFile = await deleteFileFromDb(userId, date, true);
    console.log(`[FileManager] File deleted: ${deletedFile}`);

    // Update local state
    if (deletedFile) {
      this.files.set(this.files.filter((f) => f.date !== date));
    }

    return { deletedTranscript, deletedFile };
  }

  /**
   * Empty trash - permanently delete all trashed files
   * Deletes: File records, DailyTranscript, Notes, Chat history, and R2 transcripts
   */
  @rpc
  async emptyTrash(): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const userId = this._session?.userId;
    if (!userId) {
      return { deletedCount: 0, errors: ["No user session"] };
    }

    console.log(`[FileManager] Emptying trash for user ${userId}`);

    // Get all trashed files
    const trashedFiles = await getFiles(userId, { isTrashed: true });
    console.log(`[FileManager] Found ${trashedFiles.length} trashed files to delete`);

    const errors: string[] = [];
    let deletedCount = 0;

    for (const file of trashedFiles) {
      const date = file.date;
      console.log(`[FileManager] Deleting all data for ${date}...`);

      try {
        // 1. Delete from R2 (if exists)
        if (file.r2Key) {
          const r2Result = await deleteFromR2({ userId, date });
          if (!r2Result.success) {
            console.warn(`[FileManager] Failed to delete R2 for ${date}:`, r2Result.error);
            // Continue anyway - R2 deletion is not critical
          }
        }

        // 2. Delete notes for this date
        const deletedNotes = await deleteNotesByDate(userId, date);
        console.log(`[FileManager] Deleted ${deletedNotes} notes for ${date}`);

        // 3. Delete chat history for this date
        await deleteChatHistory(userId, date);
        console.log(`[FileManager] Deleted chat history for ${date}`);

        // 4. Delete DailyTranscript
        await deleteDailyTranscript(userId, date);
        console.log(`[FileManager] Deleted DailyTranscript for ${date}`);

        // 5. Delete File record
        await deleteFileFromDb(userId, date, true);
        console.log(`[FileManager] Deleted File record for ${date}`);

        deletedCount++;
      } catch (error) {
        const errorMsg = `Failed to delete ${date}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[FileManager] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Clear local files state (we're viewing trash, so it should be empty now)
    if (this.activeFilter === "trash") {
      this.files.set([]);
    }

    // Update counts
    await this.refreshCounts();

    console.log(`[FileManager] Empty trash complete: ${deletedCount} deleted, ${errors.length} errors`);
    return { deletedCount, errors };
  }
}
