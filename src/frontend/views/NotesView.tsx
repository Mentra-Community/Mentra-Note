/**
 * NotesView - Display notes and transcripts using useSynced
 *
 * Simplified for Notes app - no meeting references
 * Fully synced - no REST calls, all data comes from WebSocket
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  DailyFolder,
  Note as DisplayNote,
  TranscriptionSegment,
} from "../lib/mockData";
import { FolderList } from "../components/notes/FolderList";
import { FolderDetail } from "../components/notes/FolderDetail";
import {
  FileText,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
} from "lucide-react";
import { useSynced } from "../hooks/useSynced";
import type { SessionI, Note, TranscriptSegment } from "../../shared/types";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useMentraAuth } from "@mentra/react";

export const NotesView: React.FC = () => {
  const { userId } = useMentraAuth();
  const { session, isConnected, reconnect } = useSynced<SessionI>(userId || "");

  const [selectedFolder, setSelectedFolder] = useState<DailyFolder | null>(
    null,
  );

  // Derive data from session
  const notes = session?.notes?.notes ?? [];
  const generating = session?.notes?.generating ?? false;
  const segments = session?.transcript?.segments ?? [];
  const isRecording = session?.transcript?.isRecording ?? false;

  // Transform synced data to folder format
  const folders = useMemo((): DailyFolder[] => {
    // Group notes by date
    const notesByDate = new Map<string, Note[]>();

    notes.forEach((note) => {
      // Use local date to avoid timezone issues
      const noteDate = note.createdAt ? new Date(note.createdAt) : new Date();
      const date = `${noteDate.getFullYear()}-${String(noteDate.getMonth() + 1).padStart(2, "0")}-${String(noteDate.getDate()).padStart(2, "0")}`;
      if (!notesByDate.has(date)) {
        notesByDate.set(date, []);
      }
      notesByDate.get(date)!.push(note);
    });

    // Add today if we have transcript segments
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Always add today if we have segments
    if (segments.length > 0) {
      if (!notesByDate.has(today)) {
        notesByDate.set(today, []);
      }
    }

    // Get all unique dates
    const allDates = new Set([...notesByDate.keys()]);

    // Transform to DailyFolder format
    return Array.from(allDates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => {
        const dateNotes = notesByDate.get(date) || [];
        // Parse date string as local date (not UTC) to avoid timezone issues
        const [year, month, day] = date.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day); // month is 0-indexed
        const isTodayDate = date === today;

        // Transform notes to display format
        const transformedNotes: DisplayNote[] = dateNotes.map((note, idx) => ({
          id: note.id || `note-${date}-${idx}`,
          title: note.title || "Untitled Note",
          createdAt: note.createdAt
            ? new Date(note.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : format(dateObj, "h:mm a"),
          summary: note.summary || note.content?.substring(0, 200) || "",
          decisions: [],
          actionItems: [],
          isPinned: false,
        }));

        // Transform transcript segments for today - show ALL segments
        const folderTranscriptions: TranscriptionSegment[] = isTodayDate
          ? segments.map((seg, idx) => ({
              id: `seg-${idx}`,
              time: seg.timestamp
                ? new Date(seg.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "",
              text: seg.text,
              speaker: seg.speakerId ? `Speaker ${seg.speakerId}` : "You",
            }))
          : [];

        return {
          id: `folder-${date}`,
          date: dateObj,
          isToday: isTodayDate,
          isTranscribing: isTodayDate && isRecording,
          isStarred: false,
          transcriptions: folderTranscriptions,
          notes: transformedNotes,
          audio: [],
        };
      });
  }, [notes, segments, isRecording]);

  // Auto-select first folder when data loads
  useEffect(() => {
    if (!selectedFolder && folders.length > 0) {
      setSelectedFolder(folders[0]);
    }
  }, [folders, selectedFolder]);

  // Update selected folder when folders change
  useEffect(() => {
    if (selectedFolder) {
      const updated = folders.find((f) => f.id === selectedFolder.id);
      if (updated) {
        setSelectedFolder(updated);
      }
    }
  }, [folders, selectedFolder?.id]);

  // Handle generate note RPC
  const handleGenerateNote = async () => {
    if (!session?.notes?.generateNote) return;
    try {
      await session.notes.generateNote();
    } catch (err) {
      console.error("[NotesView] Failed to generate note:", err);
    }
  };

  // Loading state - no session yet
  if (!session) {
    return (
      <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Left Panel - Folder List */}
      <div className="w-72 shrink-0 hidden md:flex flex-col">
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolder?.id || null}
          onSelectFolder={setSelectedFolder}
        />

        {/* Status Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi size={12} className="text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Synced
                  </span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-zinc-400" />
                  <span className="text-[10px] text-zinc-500">
                    Disconnected
                  </span>
                </>
              )}
            </div>
            <button
              onClick={reconnect}
              disabled={isConnected}
              className={clsx(
                "p-1 rounded transition-colors",
                isConnected
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-800",
              )}
              title="Reconnect"
            >
              <RefreshCw
                size={12}
                className={clsx(
                  "text-zinc-400",
                  !isConnected && "animate-spin",
                )}
              />
            </button>
          </div>

          {/* Generate Note Button - always visible when there are segments */}
          {segments.length > 0 && (
            <button
              onClick={handleGenerateNote}
              disabled={generating}
              className={clsx(
                "w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2",
                generating
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900",
              )}
            >
              {generating ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus size={12} />
                  Generate Note
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Folder Detail */}
      <div className="flex-1 min-w-0">
        {selectedFolder ? (
          <FolderDetail
            folder={selectedFolder}
            onClose={() => setSelectedFolder(null)}
          />
        ) : folders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 p-8">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              <FileText size={32} />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                No notes yet
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
                Notes and transcriptions will appear here once you start
                recording with your glasses connected.
              </p>
              {!isConnected && (
                <button
                  onClick={reconnect}
                  className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              <FileText size={32} />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                Select a day
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
                Choose a day from the list to view transcriptions and notes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Folder List (shown when no folder selected) */}
      {!selectedFolder && (
        <div className="absolute inset-0 md:hidden">
          <FolderList
            folders={folders}
            selectedFolderId={null}
            onSelectFolder={setSelectedFolder}
          />
        </div>
      )}
    </div>
  );
};
