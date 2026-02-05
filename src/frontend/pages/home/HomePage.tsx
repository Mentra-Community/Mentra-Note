/**
 * HomePage - Main landing page showing the list of days/folders
 *
 * Displays all days with notes and transcriptions in a list format.
 * On mobile, this is full-screen. On desktop, this serves as the sidebar content.
 */

import { useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { Loader2, FileText, Calendar, Sparkles } from "lucide-react";
import { useSynced } from "../../hooks/useSynced";
import type { SessionI, Note, TranscriptSegment } from "../../../shared/types";
import { FolderList } from "./components/FolderList";
import type { DailyFolder } from "./components/FolderList";

export function HomePage() {
  const { userId } = useMentraAuth();
  const { session, isConnected, reconnect } = useSynced<SessionI>(userId || "");
  const [, setLocation] = useLocation();

  // Derive data from session
  const notes = session?.notes?.notes ?? [];
  const segments = session?.transcript?.segments ?? [];
  const isRecording = session?.transcript?.isRecording ?? false;
  const availableDates = session?.transcript?.availableDates ?? [];

  // Transform synced data to folder format
  const folders = useMemo((): DailyFolder[] => {
    // Group notes by date
    const notesByDate = new Map<string, Note[]>();

    notes.forEach((note) => {
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

    if (segments.length > 0) {
      if (!notesByDate.has(today)) {
        notesByDate.set(today, []);
      }
    }

    // Combine dates from notes and available transcript dates from backend
    const allDates = new Set([...notesByDate.keys(), ...availableDates]);

    // Transform to DailyFolder format
    return Array.from(allDates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => {
        const dateNotes = notesByDate.get(date) || [];
        const [year, month, day] = date.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day);
        const isTodayDate = date === today;

        // Count transcript segments for today only (historical counts come from availableDates)
        const transcriptCount = isTodayDate ? segments.length : 0;
        const hasHistoricalTranscript = availableDates.includes(date);

        return {
          id: date,
          date: dateObj,
          dateString: date,
          isToday: isTodayDate,
          isTranscribing: isTodayDate && isRecording,
          noteCount: dateNotes.length,
          transcriptCount,
          hasTranscript: isTodayDate
            ? segments.length > 0
            : hasHistoricalTranscript,
        };
      });
  }, [notes, segments, isRecording, availableDates]);

  const handleSelectFolder = (folder: DailyFolder) => {
    setLocation(`/day/${folder.dateString}`);
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

  // Empty state
  if (folders.length === 0) {
    return (
      <div className="flex h-full flex-col bg-zinc-50 dark:bg-black">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              Mentra Notes
            </h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500">
                <Calendar size={20} />
              </button>
              <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500">
                <Sparkles size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4 p-8">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <FileText size={32} />
          </div>
          <div className="text-center max-w-sm">
            <p className="font-medium text-zinc-600 dark:text-zinc-400">
              No notes yet
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
              Notes and transcriptions will appear here once you start recording
              with your glasses connected.
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
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
      <FolderList folders={folders} onSelectFolder={handleSelectFolder} />
    </div>
  );
}
