/**
 * HomePage — Transcripts-only view.
 *
 * Background conversation detection and auto-note generation still run server-side;
 * the old Conversations list, filter drawer, calendar, merge/export,
 * and FAB mic controls have been removed.
 *
 * Long-press a transcript day to enter multi-select mode for bulk export/delete.
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigation } from "../../navigation/NavigationStack";
import { useMentraAuth } from "@mentra/react";
import { AnimatePresence } from "motion/react";
import { useSynced } from "../../hooks/useSynced";
import { useMultiSelect } from "../../hooks/useMultiSelect";
import type { SessionI } from "../../../shared/types";
import { TranscriptList } from "./components/TranscriptList";
import { HomePageSkeleton } from "../../components/shared/SkeletonLoader";
import { SelectionHeader } from "../../components/shared/SelectionHeader";
import { MultiSelectBar, ExportIcon, DeleteIcon } from "../../components/shared/MultiSelectBar";
import { ExportDrawer, type ExportOptions } from "../../components/shared/ExportDrawer";
import { EmailDrawer } from "../../components/shared/EmailDrawer";
import { DeleteTranscriptDrawer } from "../../components/shared/DeleteTranscriptDrawer";
import { MicrophoneHeadIcon, PauseIcon } from "../../components/shared/custom-icons";
import { toast } from "../../components/shared/toast";
import { useTabBar } from "../../components/layout/Shell";

export function HomePage() {
  const { userId } = useMentraAuth();
  const { session } = useSynced<SessionI>(userId || "");
  const { push } = useNavigation();

  const transcriptSelect = useMultiSelect();
  const tabBar = useTabBar();

  // Slide the bottom tab bar out while in selection mode so MultiSelectBar can take its place
  useEffect(() => {
    tabBar.setHidden(transcriptSelect.isSelecting);
    return () => tabBar.setHidden(false);
  }, [transcriptSelect.isSelecting, tabBar]);

  const [showExportDrawer, setShowExportDrawer] = useState(false);
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pendingDatesRef = useRef<string[]>([]);

  const files = session?.file?.files ?? [];
  const isRecording = session?.transcript?.isRecording ?? false;
  const transcriptionPaused = session?.settings?.transcriptionPaused ?? false;
  const availableDates = session?.transcript?.availableDates ?? [];
  const conversations = session?.conversation?.conversations ?? [];

  const toggleTranscription = () => {
    session?.settings?.updateSettings({ transcriptionPaused: !transcriptionPaused });
  };

  // ── Multi-select handlers ──

  const handleBatchExport = useCallback(async (options: ExportOptions) => {
    if (!session?.transcript) return;

    const selectedDates = [...transcriptSelect.selectedIds];
    const textParts: string[] = [];

    for (const dateStr of selectedDates) {
      try {
        const result = await session.transcript.loadDateTranscript(dateStr);
        if (result?.segments && result.segments.length > 0) {
          const [year, month, day] = dateStr.split("-").map(Number);
          const dateObj = new Date(year, month - 1, day);
          const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

          const segmentLines = result.segments.map((s) => {
            const time = new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            return `[${time}] ${s.text}`;
          }).join("\n");

          textParts.push(`# Transcript — ${dateLabel}\n${segmentLines}`);
        }
      } catch (err) {
        console.error(`Failed to load transcript for ${dateStr}:`, err);
      }
    }

    if (options.destination === "email") {
      pendingDatesRef.current = selectedDates;
      setShowEmailDrawer(true);
      return;
    }

    const text = textParts.join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
      return;
    }
    transcriptSelect.cancel();
  }, [transcriptSelect, session]);

  const handleEmailSend = useCallback(async (to: string, cc: string) => {
    const dates = pendingDatesRef.current;
    if (dates.length === 0 || !session?.transcript) return;

    const emailNotes: Array<{
      noteId: string;
      noteTimestamp: string;
      noteTitle: string;
      noteContent: string;
      noteType: string;
    }> = [];

    let sessionDate = "";
    let firstStart = "";
    let lastEnd = "";

    for (const dateStr of dates) {
      const result = await session.transcript.loadDateTranscript(dateStr);
      if (!result?.segments?.length) continue;

      const [year, month, day] = dateStr.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      if (!sessionDate) sessionDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const segmentLines = result.segments.map((s) => {
        const time = new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        if (!firstStart) firstStart = time;
        lastEnd = time;
        return `<tr><td style="color:#A8A29E;font-size:13px;padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap;">${time}</td><td style="color:#1C1917;font-size:14px;line-height:21px;padding:4px 0;">${s.text}</td></tr>`;
      }).join("");

      const segCount = result.segments.length;
      const startTime = new Date(result.segments[0].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const endTime = new Date(result.segments[result.segments.length - 1].timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      emailNotes.push({
        noteId: `transcript-${dateStr}`,
        noteTimestamp: `${startTime} — ${endTime}`,
        noteTitle: dateLabel,
        noteContent: `<p style="margin:0 0 12px;color:#A8A29E;font-size:12px;">${segCount} segments</p><table cellpadding="0" cellspacing="0" border="0" width="100%">${segmentLines}</table>`,
        noteType: "Transcript",
      });
    }

    if (emailNotes.length === 0) return;

    const ccList = cc ? cc.split(",").filter(Boolean) : undefined;

    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        to,
        cc: ccList,
        sessionDate: sessionDate || "Transcripts",
        sessionStartTime: firstStart,
        sessionEndTime: lastEnd,
        notes: emailNotes,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to send email");
    toast.success(`Email sent to ${to}`);
    transcriptSelect.cancel();
  }, [session, transcriptSelect]);

  const handleBatchDeleteConfirmed = useCallback(async () => {
    if (!session?.file) return;
    const dates = [...transcriptSelect.selectedIds];
    for (const dateStr of dates) {
      await session.file.trashFile(dateStr);
    }
    await session.transcript?.removeDates(dates);
    setShowDeleteConfirm(false);
    transcriptSelect.cancel();
  }, [transcriptSelect, session]);

  const selectActions = useMemo(() => [
    { icon: <ExportIcon />, label: "Export", onClick: () => setShowExportDrawer(true) },
    { icon: <DeleteIcon />, label: "Delete", onClick: () => setShowDeleteConfirm(true), variant: "danger" as const },
  ], []);

  const exportLabel = useMemo(
    () => `${transcriptSelect.count} transcript${transcriptSelect.count === 1 ? "" : "s"} selected`,
    [transcriptSelect.count],
  );

  const selectableDates = availableDates;

  if (!session) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col bg-[#FAFAF9] overflow-hidden">
      {/* Header — swaps between normal and selection mode (matches NotesPage) */}
      {transcriptSelect.isSelecting ? (
        <div className="shrink-0 pt-3">
          <SelectionHeader
            count={transcriptSelect.count}
            onCancel={transcriptSelect.cancel}
            onSelectAll={() => transcriptSelect.selectAll(selectableDates)}
          />
        </div>
      ) : (
        <div className="flex flex-col pt-1.5 pb-3 gap-0.5 px-6 shrink-0">
          <div className="text-[11px] tracking-[1.5px] uppercase text-[#DC2626] font-red-hat font-bold leading-3.5">
            Mentra Notes
          </div>
          <div className="text-[34px] leading-10.5 text-[#1A1A1A] font-red-hat font-black tracking-[-0.5px]">
            Transcripts
          </div>
          <div className="text-[14px] leading-4.5 text-[#A8A29E] font-red-hat pt-1">
            {availableDates.length} {availableDates.length === 1 ? "day" : "days"} of transcripts
          </div>
        </div>
      )}
      {/* Transcribing status bar — hidden during selection */}
      {!transcriptSelect.isSelecting && (
        <div
          className={`flex items-center justify-between px-6 border-b shrink-0 ${
            transcriptionPaused
              ? "py-4 bg-[#F5F3F0] border-[#E8E5E1]"
              : "py-3.5 bg-[#D32F2F0D] border-[#D32F2F1A]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`rounded-[5px] shrink-0 size-2.5 ml-[2px] ${
                transcriptionPaused
                  ? "bg-[#B0AAA2]"
                  : "bg-[#D32F2F] animate-pulse [box-shadow:#D32F2F2E_0px_0px_0px_3px]"
              }`}
            />
            <div className="flex flex-col gap-px">
              <div
                className={`text-[14px] leading-4.5 font-red-hat font-bold ${
                  transcriptionPaused ? "text-[#6B655D]" : "text-[#D32F2F] tracking-[-0.2px]"
                }`}
              >
                {transcriptionPaused ? "Paused" : "Transcribing"}
              </div>
              <div className="text-[11px] leading-3.5 text-[#9C958D] font-red-hat font-medium">
                {transcriptionPaused ? "Microphone off" : "Microphone on"}
              </div>
            </div>
          </div>
          <button
            onClick={toggleTranscription}
            className={`flex items-center rounded-3xl py-2.5 px-5 gap-1.75 ${
              transcriptionPaused
                ? "bg-[#DC2626]"
                : "bg-white border-[1.5px] border-[#E0DBD5]"
            }`}
          >
            {transcriptionPaused ? (
              <>
                <MicrophoneHeadIcon style={{ flexShrink: 0 }} />
                <span className="text-[13px] leading-4 text-white font-red-hat font-bold">
                  Resume
                </span>
              </>
            ) : (
              <>
                <PauseIcon style={{ flexShrink: 0 }} />
                <span className="text-[13px] leading-4 text-[#3D3832] font-red-hat font-bold">
                  Pause
                </span>
              </>
            )}
          </button>
        </div>
      )}
      <div className={`flex-1 overflow-hidden ${transcriptSelect.isSelecting ? "" : "px-6"}`}>
        <div className="h-full overflow-y-auto pb-32">
          <TranscriptList
            availableDates={availableDates}
            files={files}
            isRecording={isRecording}
            transcriptionPaused={transcriptionPaused}
            onSelect={(dateStr) => push(`/transcript/${dateStr}`)}
            isSelecting={transcriptSelect.isSelecting}
            selectedDates={transcriptSelect.selectedIds}
            onToggleSelect={(dateStr) => transcriptSelect.toggleItem(dateStr)}
            longPressProps={transcriptSelect.longPressProps}
          />
        </div>
      </div>

      {/* Multi-select bottom bar */}
      <AnimatePresence>
        {transcriptSelect.isSelecting && (
          <MultiSelectBar actions={selectActions} />
        )}
      </AnimatePresence>

      {/* Export Drawer */}
      <ExportDrawer
        isOpen={showExportDrawer}
        onClose={() => setShowExportDrawer(false)}
        itemType="transcript"
        itemLabel={exportLabel}
        count={transcriptSelect.count}
        onExport={handleBatchExport}
      />

      {/* Email Drawer */}
      <EmailDrawer
        isOpen={showEmailDrawer}
        onClose={() => setShowEmailDrawer(false)}
        onSend={handleEmailSend}
        defaultEmail={userId || ""}
        itemLabel={transcriptSelect.count === 1 ? "Transcript" : `${transcriptSelect.count} Transcripts`}
      />

      {/* Delete Confirmation */}
      <DeleteTranscriptDrawer
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBatchDeleteConfirmed}
        dates={[...transcriptSelect.selectedIds]}
        conversations={conversations}
      />
    </div>
  );
}
