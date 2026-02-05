/**
 * HomePage - Main landing page showing the list of days/folders
 *
 * Features:
 * - Filter dropdown (All Files / Archived / Trash)
 * - View modes (Folders / All Notes / Favorites)
 * - Calendar view toggle
 * - Global AI chat trigger (sparkles icon)
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import {
  Loader2,
  FileText,
  Calendar,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { motion } from "motion/react";
import { useSynced } from "../../hooks/useSynced";
import type { SessionI, Note } from "../../../shared/types";
import { FolderList } from "./components/FolderList";
import type { DailyFolder } from "./components/FolderList";
import {
  FilterDrawer,
  type FilterType,
  type ViewType,
} from "../../components/shared/FilterDrawer";

export function HomePage() {
  const { userId } = useMentraAuth();
  const { session, isConnected, reconnect } = useSynced<SessionI>(userId || "");
  const [, setLocation] = useLocation();

  // Filter & view state
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeView, setActiveView] = useState<ViewType>("folders");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

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

  // Filter counts (TODO: implement actual filtering when we have archive/trash state)
  const filterCounts = useMemo(
    () => ({
      all: folders.length,
      archived: 0,
      trash: 0,
      allNotes: notes.length,
      favorites: 0, // TODO: track favorites
    }),
    [folders, notes],
  );

  // Get filter label for display
  const getFilterLabel = (): string => {
    if (activeView === "all_notes") return "All Notes";
    if (activeView === "favorites") return "Favorites";
    switch (activeFilter) {
      case "archived":
        return "Archived";
      case "trash":
        return "Trash";
      default:
        return "All Files";
    }
  };

  const handleSelectFolder = (folder: DailyFolder) => {
    setLocation(`/day/${folder.dateString}`);
  };

  const handleGlobalChat = () => {
    // TODO: implement global AI chat view
    console.log("Open global AI chat");
  };

  const handleCalendarToggle = () => {
    setViewMode((prev) => (prev === "list" ? "calendar" : "list"));
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
        <div className="px-6 pt-4 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 group -ml-2 px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <h1 className="text-xl font-normal text-zinc-900 dark:text-white tracking-tight">
                {getFilterLabel()}
              </h1>
              <ChevronDown
                size={20}
                className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors mt-0.5"
              />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCalendarToggle}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Calendar size={20} strokeWidth={1.5} />
              </button>

              <button
                onClick={handleGlobalChat}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <motion.div
                  animate={{
                    filter: [
                      "drop-shadow(0px 0px 0px rgba(34, 197, 94, 0))",
                      "drop-shadow(0px 0px 6px rgba(34, 197, 94, 0.6))",
                      "drop-shadow(0px 0px 0px rgba(34, 197, 94, 0))",
                    ],
                    color: ["#71717a", "#22c55e", "#71717a"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                  className="text-current"
                >
                  <Sparkles size={20} strokeWidth={1.5} />
                </motion.div>
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

        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          activeFilter={activeFilter}
          activeView={activeView}
          onFilterChange={setActiveFilter}
          onViewChange={setActiveView}
          counts={filterCounts}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-4 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-1.5 group -ml-2 px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <h1 className="text-xl font-normal text-zinc-900 dark:text-white tracking-tight">
              {getFilterLabel()}
            </h1>
            <ChevronDown
              size={20}
              className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors mt-0.5"
            />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCalendarToggle}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <Calendar size={20} strokeWidth={1.5} />
            </button>

            <button
              onClick={handleGlobalChat}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <motion.div
                animate={{
                  filter: [
                    "drop-shadow(0px 0px 0px rgba(34, 197, 94, 0))",
                    "drop-shadow(0px 0px 6px rgba(34, 197, 94, 0.6))",
                    "drop-shadow(0px 0px 0px rgba(34, 197, 94, 0))",
                  ],
                  color: ["#71717a", "#22c55e", "#71717a"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
                className="text-current"
              >
                <Sparkles size={20} strokeWidth={1.5} />
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" ? (
          <FolderList folders={folders} onSelectFolder={handleSelectFolder} />
        ) : (
          // TODO: Calendar view
          <div className="flex items-center justify-center h-full text-zinc-400">
            <p>Calendar view coming soon</p>
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFilter={activeFilter}
        activeView={activeView}
        onFilterChange={setActiveFilter}
        onViewChange={setActiveView}
        counts={filterCounts}
      />
    </div>
  );
}
