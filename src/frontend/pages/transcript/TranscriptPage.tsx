/**
 * TranscriptPage - Dedicated transcript view for a specific date.
 * UI matches the Paper design system.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { DeleteTranscriptDrawer } from "../../components/shared/DeleteTranscriptDrawer";
import {
  BackChevronIcon,
  ExportIcon,
  EmailIcon,
  CopyIcon,
  TrashIcon,
  MicrophoneSolidIcon,
  StopRecordingIcon,
} from "../../components/shared/custom-icons";
import { useNavigation } from "../../navigation/NavigationStack";
import { useMentraAuth } from "@mentra/react";
import { format, parse } from "date-fns";
import { toast } from "../../components/shared/toast";
import { useSynced } from "../../hooks/useSynced";
import { useRecordingElapsed } from "../../hooks/useRecordingElapsed";
import type { SessionI } from "../../../shared/types";
import { TranscriptTab } from "../day/components/tabs/TranscriptTab";
import { EmailDrawer } from "../../components/shared/EmailDrawer";
import { DropdownMenu } from "../../components/shared/DropdownMenu";
import { DayPageSkeleton } from "../../components/shared/SkeletonLoader";
import { StopTranscriptionDialog } from "../home/components/StopTranscriptionDialog";

export function TranscriptPage() {
  const params = useParams<{ date: string }>();
  const { back } = useNavigation();
  const { userId } = useMentraAuth();
  const { session, isReconnecting } = useSynced<SessionI>(userId || "");

  const dateString = params.date || "";
  const date = useMemo(() => {
    try {
      return parse(dateString, "yyyy-MM-dd", new Date());
    } catch {
      return new Date();
    }
  }, [dateString]);

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = dateString === todayString;

  // Deep-link support:
  //   /transcript/{date}#hour-N  — expand + scroll to that hour
  //   /transcript/{date}#seg-<segId>  — expand the segment's hour, scroll to it,
  //                                     yellow-flash it for ~1.5s
  // Parsed once on mount; the TranscriptTab effect handles the actual scroll
  // once segments are hydrated.
  const { targetHour, targetSegId } = useMemo<{
    targetHour: number | undefined;
    targetSegId: string | undefined;
  }>(() => {
    if (typeof window === "undefined") return { targetHour: undefined, targetSegId: undefined };
    const hash = window.location.hash || "";
    console.log(`[TranscriptPage] URL: ${window.location.href} | hash: "${hash}"`);
    const hourMatch = hash.match(/^#hour-(\d{1,2})$/);
    if (hourMatch) {
      const h = parseInt(hourMatch[1], 10);
      if (Number.isFinite(h) && h >= 0 && h <= 23) {
        console.log(`[TranscriptPage] Parsed targetHour=${h}`);
        return { targetHour: h, targetSegId: undefined };
      }
    }
    const segMatch = hash.match(/^#seg-(.+)$/);
    if (segMatch) {
      try {
        const segId = decodeURIComponent(segMatch[1]);
        console.log(`[TranscriptPage] Parsed targetSegId=${segId}`);
        return { targetHour: undefined, targetSegId: segId };
      } catch {
        // fall through
      }
    }
    console.log(`[TranscriptPage] No deep-link target in hash`);
    return { targetHour: undefined, targetSegId: undefined };
  }, []);

  // Session data
  const allSegments = session?.transcript?.segments ?? [];
  const hourSummaries = session?.summary?.hourSummaries ?? [];
  const interimText = session?.transcript?.interimText ?? "";
  const transcriptionPaused = session?.settings?.transcriptionPaused ?? false;
  const isSyncingPhoto = session?.transcript?.isSyncingPhoto ?? false;
  const loadedDate = session?.transcript?.loadedDate ?? "";

  // Loading state
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const lastLoadedDateRef = useRef<string | null>(null);
  const historicalSegmentCountRef = useRef<number | null>(null);
  const isLoadingHistory = session?.transcript?.isLoadingHistory ?? false;
  const isTranscriptHydrated = session?.transcript?.isHydrated ?? false;
  const dateMatchesServer = loadedDate === dateString;
  const isDataLoading =
    !isTranscriptHydrated ||
    isLoadingHistory ||
    isLoadingTranscript ||
    !dateMatchesServer;

  // Compact mode
  const serverCompactMode = session?.settings?.superCollapsed ?? false;
  // Default to compact on this page — overridden by user toggle or server setting
  const [optimisticCompact, setOptimisticCompact] = useState<boolean | null>(true);
  const compactDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompactMode = optimisticCompact ?? serverCompactMode;

  useEffect(() => {
    if (optimisticCompact !== null && serverCompactMode === optimisticCompact) {
      setOptimisticCompact(null);
    }
  }, [serverCompactMode, optimisticCompact]);

  const toggleCompactMode = useCallback(() => {
    const newValue = !isCompactMode;
    setOptimisticCompact(newValue);
    if (compactDebounceRef.current) clearTimeout(compactDebounceRef.current);
    compactDebounceRef.current = setTimeout(() => {
      session?.settings?.updateSettings({ superCollapsed: newValue });
    }, 300);
  }, [isCompactMode, session?.settings]);

  // Deep-link reveal gate: when the URL has #seg- or #hour-, we hold the page
  // behind a skeleton until the target is scrolled into view, so the user
  // never sees the transcript jump around. Capped at 12s as a safety net so
  // slow R2 fetches or hour-summary backfills don't leave the user stuck.
  const hasDeepLink = targetHour !== undefined || targetSegId !== undefined;
  const [deepLinkReady, setDeepLinkReady] = useState(!hasDeepLink);
  useEffect(() => {
    if (!hasDeepLink) return;
    const t = setTimeout(() => setDeepLinkReady(true), 12000);
    return () => clearTimeout(t);
  }, [hasDeepLink]);

  // Stop transcription confirmation dialog
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const handleStopTranscription = useCallback(async () => {
    await session?.settings?.updateSettings({ transcriptionPaused: true });
    setShowStopConfirm(false);
  }, [session?.settings]);

  // Email drawer
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);

  // Delete transcript confirmation drawer
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Elapsed time for live recording — persisted across mounts via localStorage.
  // Ticks while unpaused, freezes (still visible) while paused, resets at midnight.
  const elapsedSeconds = useRecordingElapsed({
    isToday,
    isPaused: transcriptionPaused,
  });

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Reset date tracking after reconnection
  useEffect(() => {
    if (!isReconnecting && lastLoadedDateRef.current) {
      lastLoadedDateRef.current = null;
    }
  }, [isReconnecting]);

  // Load transcript for this date
  useEffect(() => {
    if (!session?.transcript?.loadDateTranscript) return;
    if (!dateString || isReconnecting) return;
    if (lastLoadedDateRef.current === dateString) return;

    // NOTE: we used to skip loading when `loadedDate === dateString` already,
    // but TranscriptManager sets `loadedDate` optimistically before segments
    // finish fetching — skipping caused the empty state to flash for today.
    // Always trigger the load so `isLoadingTranscript` covers the real window.

    lastLoadedDateRef.current = dateString;
    setIsLoadingTranscript(true);

    if (dateString === todayString) {
      session.transcript
        .loadTodayTranscript()
        .catch((err) => console.error("[TranscriptPage] Failed to load today:", err))
        .finally(() => setIsLoadingTranscript(false));
    } else {
      session.transcript
        .loadDateTranscript(dateString)
        .catch((err) => console.error(`[TranscriptPage] Failed to load ${dateString}:`, err))
        .finally(() => setIsLoadingTranscript(false));
    }
  }, [dateString, todayString, loadedDate, session?.transcript, isReconnecting]);

  // Snapshot segment count when historical date finishes loading
  useEffect(() => {
    if (!isDataLoading && loadedDate === dateString) {
      historicalSegmentCountRef.current = isToday ? null : allSegments.length;
    }
  }, [isDataLoading, loadedDate, dateString, isToday, allSegments.length]);

  useEffect(() => {
    historicalSegmentCountRef.current = null;
  }, [dateString]);

  // Timezone-aware segment date helper
  const timezone = session?.settings?.timezone ?? undefined;
  const getSegmentDate = useCallback((timestamp: Date | string): string => {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (timezone) {
      const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric", month: "2-digit", day: "2-digit",
        timeZone: timezone,
      }).formatToParts(d);
      const y = parts.find((p) => p.type === "year")?.value || "2026";
      const m = parts.find((p) => p.type === "month")?.value || "01";
      const day = parts.find((p) => p.type === "day")?.value || "01";
      return `${y}-${m}-${day}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [timezone]);

  const daySegments = useMemo(() => {
    if (isDataLoading) return [];
    // Hard guard: until the server's loadedDate matches the route, treat the
    // segments array as stale — it may still hold the previous day's payload
    // from before we navigated.
    if (loadedDate !== dateString) return [];

    // Belt-and-suspenders: even when loadedDate matches, the client mirror of
    // `segments` can lag behind for a render or two after a date switch (the
    // server clears segments first, then streams the new day's via @synced —
    // those arrive in separate frames). Filter by timestamp so stale segments
    // from another day get dropped regardless of what the array still holds.
    let filtered = allSegments.filter(
      (s) => !s.timestamp || getSegmentDate(s.timestamp) === dateString,
    );

    if (!isToday && historicalSegmentCountRef.current !== null) {
      filtered = filtered.slice(0, historicalSegmentCountRef.current);
    }

    // Dedupe by id. R2 transcript files from older sessions can contain
    // duplicate `seg.index` values (merge bugs in r2Upload.service), which
    // gives multiple segments the same `seg_N` id. React warns about the
    // collision AND the deep-link's querySelector can land on the wrong
    // node. Keep the first occurrence of each id.
    const seen = new Set<string>();
    const deduped: typeof filtered = [];
    for (const s of filtered) {
      const id = s.id || "";
      if (seen.has(id)) continue;
      seen.add(id);
      deduped.push(s);
    }
    return deduped;
  }, [allSegments, dateString, loadedDate, isDataLoading, isToday, getSegmentDate]);

  const handleCopyTranscript = useCallback(async () => {
    const finalSegments = daySegments.filter((s) => s.isFinal && s.type !== "photo");
    if (finalSegments.length === 0) {
      toast.error("No transcript to copy");
      return;
    }
    const dateLabel = isToday ? "Today" : format(date, "MMMM d, yyyy");
    const lines = finalSegments.map((s) => {
      const time = new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `[${time}] ${s.text}`;
    });
    const text = `# Transcript — ${dateLabel}\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [daySegments, isToday, date]);

  const handleDeleteTranscript = useCallback(() => {
    if (!session?.file || !session?.transcript) return;
    setShowDeleteConfirm(true);
  }, [session?.file, session?.transcript]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!session?.file || !session?.transcript) {
      setShowDeleteConfirm(false);
      return;
    }
    await session.file.trashFile(dateString);
    await session.transcript.removeDates([dateString]);
    setShowDeleteConfirm(false);
    back();
  }, [session?.file, session?.transcript, dateString, back]);

  const handleEmailSend = useCallback(async (to: string, cc: string) => {
    const finalSegments = daySegments
      .filter((s) => s.isFinal && s.type !== "photo")
      .map((s) => ({
        timestamp: new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        text: s.text,
      }));
    if (finalSegments.length === 0) throw new Error("No transcript segments to send");

    const noteDate = new Date(dateString + "T00:00:00");
    const sessionDate = noteDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const firstSeg = daySegments.find((s) => s.isFinal);
    const lastSeg = [...daySegments].reverse().find((s) => s.isFinal);
    const startTime = firstSeg ? new Date(firstSeg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
    const endTime = lastSeg ? new Date(lastSeg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";

    const ccList = cc ? cc.split(",").filter(Boolean) : undefined;
    const res = await fetch("/api/transcript/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ to, cc: ccList, userId, date: dateString, sessionDate, sessionStartTime: startTime, sessionEndTime: endTime, segments: finalSegments }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to send email");
    toast.success(`Email sent to ${to}`);
  }, [daySegments, dateString, userId]);

  if (!session || isReconnecting) {
    return <DayPageSkeleton />;
  }

  const currentHour = new Date().getHours();

  // Header title + time range subtitle (Paper design)
  const headerLabel = isToday ? "Today" : format(date, "MMM d");
  const finalSegs = daySegments.filter((s) => s.isFinal && s.timestamp);
  const firstSeg = finalSegs[0];
  const lastSeg = finalSegs[finalSegs.length - 1];
  const timeRangeLabel = (() => {
    if (!firstSeg || !lastSeg) return format(date, "MMMM d, yyyy");
    const start = new Date(firstSeg.timestamp);
    const end = new Date(lastSeg.timestamp);
    const startStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const mins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
    return `${startStr} – ${endStr} · ${duration}`;
  })();

  return (
    <div className="relative h-full flex flex-col bg-[#FCFBFA]">
      {/* Deep-link reveal gate — keeps the page invisible until the target
          segment/hour has been scrolled into view (capped at 4s). */}
      {!deepLinkReady && (
        <div className="absolute inset-0 z-20 bg-[#FCFBFA]">
          <DayPageSkeleton />
        </div>
      )}
      {/* Header */}
      <div className="shrink-0 flex items-end justify-between pt-4 pb-4 px-6">
        <div className="flex items-center grow gap-3">
          <button
            onClick={() => back()}
            className="p-1 -ml-1 text-[#1A1A1A]"
          >
            <BackChevronIcon style={{ flexShrink: 0 }} />
          </button>
          <div className="flex flex-col gap-3">
            <div className="text-[22px] leading-7 tracking-[-0.4px] text-[#1A1A1A] font-red-hat font-extrabold">
              {headerLabel}
            </div>
            <div className="text-[13px] leading-4 text-[#9C958D] font-red-hat">
              {timeRangeLabel}
            </div>
          </div>
        </div>
        <div className="flex pt-1 gap-3 -mb-1">
          <DropdownMenu
            align="right"
            trigger={
              <button className="p-1" aria-label="Share transcript">
                <ExportIcon />
              </button>
            }
            options={[
              {
                id: "email",
                label: "Email transcript",
                icon: <EmailIcon />,
                onClick: () => setShowEmailDrawer(true),
              },
              {
                id: "copy",
                label: "Copy to clipboard",
                icon: <CopyIcon />,
                onClick: () => { handleCopyTranscript(); },
              },
            ]}
          />
          <button
            onClick={handleDeleteTranscript}
            className="p-1"
            aria-label="Delete transcript"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Transcript content */}
      <div className="flex-1 min-h-0 overflow-hidden px-6">
        <TranscriptTab
          segments={daySegments}
          hourSummaries={hourSummaries}
          interimText={isToday ? interimText : ""}
          currentHour={isToday ? currentHour : undefined}
          dateString={dateString}
          timezone={timezone}
          onGenerateSummary={session?.summary?.generateHourSummary}
          isCompactMode={isCompactMode}
          isSyncingPhoto={isToday ? isSyncingPhoto : false}
          isLoading={isDataLoading}
          targetHour={targetHour}
          targetSegId={targetSegId}
          onDeepLinkScrolled={() => setDeepLinkReady(true)}
        />
      </div>

      {/* Bottom bar — transcribing status + stop/resume button (today only) */}
      {isToday && (
        <div className="flex flex-col items-center shrink-0 pt-4 pb-10 gap-3 bg-white border-t border-[#E8E5E1] px-6">
          <div className="flex items-center gap-1.5">
            <div
              className={`rounded-[3px] shrink-0 size-1.5 ${
                transcriptionPaused ? "bg-[#A8A29E]" : "bg-[#D32F2F] animate-pulse"
              }`}
            />
            <span className="text-[13px] leading-4 text-[#6B655D] font-red-hat font-medium">
              {transcriptionPaused
                ? `Paused · ${formatElapsed(elapsedSeconds)}`
                : `Transcribing · ${formatElapsed(elapsedSeconds)}`}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              {transcriptionPaused ? (
                <button
                  onClick={() => session?.settings?.updateSettings({ transcriptionPaused: false })}
                  className="w-13 h-13 flex items-center justify-center rounded-[26px] bg-[#1C1917] shrink-0"
                  aria-label="Resume transcription"
                >
                  <MicrophoneSolidIcon />
                </button>
              ) : (
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="w-13 h-13 flex items-center justify-center rounded-[26px] bg-[#D32F2F] shrink-0"
                  aria-label="Stop transcription"
                >
                  <StopRecordingIcon />
                </button>
              )}
              <span
                className={`text-[11px] leading-3.5 font-red-hat font-semibold ${
                  transcriptionPaused ? "text-[#1C1917]" : "text-[#D32F2F]"
                }`}
              >
                {transcriptionPaused ? "Resume" : "Stop"}
              </span>
            </div>
          </div>
        </div>
      )}

      <StopTranscriptionDialog
        open={showStopConfirm}
        onCancel={() => setShowStopConfirm(false)}
        onConfirm={handleStopTranscription}
      />

      <EmailDrawer
        isOpen={showEmailDrawer}
        onClose={() => setShowEmailDrawer(false)}
        onSend={handleEmailSend}
        defaultEmail={userId || ""}
        itemLabel="Transcript"
      />

      <DeleteTranscriptDrawer
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirmed}
        dates={[dateString]}
        conversations={session?.conversation?.conversations ?? []}
      />
    </div>
  );
}
