/**
 * DayPage - Day detail view with tabs
 *
 * Displays a specific day's content with tabs for:
 * - Notes: List of notes for this day
 * - Transcript: Transcription segments grouped by hour
 * - Audio: Audio recordings (future)
 * - AI: AI chat interface for this day's content
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { format, parse } from "date-fns";
import { clsx } from "clsx";
import {
  ChevronLeft,
  Star,
  MoreHorizontal,
  FileText,
  MessageSquare,
  Headphones,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useSynced } from "../../hooks/useSynced";
import type {
  SessionI,
  Note,
  TranscriptSegment,
  HourSummary,
} from "../../../shared/types";
import { NotesTab } from "./components/tabs/NotesTab";
import { TranscriptTab } from "./components/tabs/TranscriptTab";
import { AudioTab } from "./components/tabs/AudioTab";
import { AITab } from "./components/tabs/AITab";

type TabType = "notes" | "transcript" | "audio" | "ai";

interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof FileText;
}

const tabs: TabConfig[] = [
  { id: "notes", label: "Notes", icon: FileText },
  { id: "transcript", label: "Transcript", icon: MessageSquare },
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "ai", label: "AI", icon: Sparkles },
];

export function DayPage() {
  const params = useParams<{ date: string }>();
  const [, setLocation] = useLocation();
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  const [activeTab, setActiveTab] = useState<TabType>("notes");
  const [isStarred, setIsStarred] = useState(false);
  const lastLoadedDateRef = useRef<string | null>(null);

  // Parse the date from URL params
  const dateString = params.date || "";
  const date = useMemo(() => {
    try {
      return parse(dateString, "yyyy-MM-dd", new Date());
    } catch {
      return new Date();
    }
  }, [dateString]);

  // Check if this is today
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = dateString === todayString;

  // Get data from session
  const allNotes = session?.notes?.notes ?? [];
  const allSegments = session?.transcript?.segments ?? [];
  const hourSummaries = session?.transcript?.hourSummaries ?? [];
  const interimText = session?.transcript?.interimText ?? "";
  const isRecording = session?.transcript?.isRecording ?? false;
  const loadedDate = session?.transcript?.loadedDate ?? "";
  const isLoadingHistory = session?.transcript?.isLoadingHistory ?? false;

  // Get current hour for determining which hour is "in progress"
  const currentHour = new Date().getHours();

  // Load historical transcript when viewing a past date
  useEffect(() => {
    if (!session?.transcript?.loadDateTranscript) return;
    if (!dateString) return;

    // Skip if we already loaded this date
    if (lastLoadedDateRef.current === dateString) return;

    // Skip if it's already the loaded date on the server
    if (loadedDate === dateString) {
      lastLoadedDateRef.current = dateString;
      return;
    }

    // Load the transcript for this date
    console.log(`[DayPage] Loading transcript for ${dateString}`);
    lastLoadedDateRef.current = dateString;

    if (dateString === todayString) {
      // Switch back to today
      session.transcript.loadTodayTranscript().catch((err) => {
        console.error("[DayPage] Failed to load today's transcript:", err);
      });
    } else {
      // Load historical date
      session.transcript.loadDateTranscript(dateString).catch((err) => {
        console.error(
          `[DayPage] Failed to load transcript for ${dateString}:`,
          err,
        );
      });
    }
  }, [dateString, todayString, loadedDate, session?.transcript]);

  // Filter notes for this day
  const dayNotes = useMemo(() => {
    return allNotes.filter((note) => {
      const noteDate = note.createdAt ? new Date(note.createdAt) : new Date();
      const noteDateString = `${noteDate.getFullYear()}-${String(noteDate.getMonth() + 1).padStart(2, "0")}-${String(noteDate.getDate()).padStart(2, "0")}`;
      return noteDateString === dateString;
    });
  }, [allNotes, dateString]);

  // Filter transcript segments for this day
  // Segments are loaded for "today" from the server, so we filter by comparing
  // the segment's local timestamp date with the selected date
  const daySegments = useMemo(() => {
    return allSegments.filter((segment) => {
      if (!segment.timestamp) return false;

      // Handle both Date objects and ISO strings (JSON serialization converts Date to string)
      const timestamp = segment.timestamp;
      const segmentDate =
        timestamp instanceof Date ? timestamp : new Date(timestamp);

      // Validate the date is valid
      if (isNaN(segmentDate.getTime())) return false;

      // Get local date components - this handles timezone conversion automatically
      // since getFullYear/Month/Date return values in local timezone
      const segmentDateString = `${segmentDate.getFullYear()}-${String(segmentDate.getMonth() + 1).padStart(2, "0")}-${String(segmentDate.getDate()).padStart(2, "0")}`;
      return segmentDateString === dateString;
    });
  }, [allSegments, dateString]);

  // Loading state
  if (!session || isLoadingHistory) {
    return (
      <div className="flex h-full bg-white dark:bg-black items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">
            {isLoadingHistory ? "Loading transcript..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    setLocation("/");
  };

  const formatHeaderDate = () => {
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        {/* Top row with back button and actions */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {formatHeaderDate()}
          </h1>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                isStarred
                  ? "text-yellow-500"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              )}
            >
              <Star size={20} fill={isStarred ? "currentColor" : "none"} />
            </button>
            <button className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-4 gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "relative pb-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Recording indicator */}
        {isToday && isRecording && (
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-red-500">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">Capturing now</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "notes" && (
          <NotesTab notes={dayNotes} dateString={dateString} />
        )}
        {activeTab === "transcript" && (
          <TranscriptTab
            segments={daySegments}
            hourSummaries={hourSummaries}
            interimText={interimText}
            currentHour={isToday ? currentHour : undefined}
            dateString={dateString}
            onGenerateSummary={session?.transcript?.generateHourSummary}
          />
        )}
        {activeTab === "audio" && <AudioTab />}
        {activeTab === "ai" && <AITab date={date} />}
      </div>
    </div>
  );
}
