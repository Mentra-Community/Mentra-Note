/**
 * NotesTab - Displays notes for a specific day
 *
 * Shows:
 * - Masonry grid of note cards (manual and AI-generated)
 * - FAB with floating action options (Generate Note, Add Note)
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { Loader2, FileText, Sparkles, Clock, PencilLine, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Drawer } from "vaul";
import { clsx } from "clsx";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useSynced } from "../../../../hooks/useSynced";
import type { SessionI, Note } from "../../../../../shared/types";
import { NoteCard } from "../NoteCard";

interface NotesTabProps {
  notes: Note[];
  dateString: string;
}

export function NotesTab({ notes, dateString }: NotesTabProps) {
  const { userId } = useMentraAuth();
  const { session } = useSynced<SessionI>(userId || "");
  const [, setLocation] = useLocation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const fabRef = useRef<HTMLDivElement>(null);

  const generating = session?.notes?.generating ?? false;

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  // Set default times when opening time picker
  useEffect(() => {
    if (showTimeRangePicker) {
      const now = new Date();
      const currentHour = now.getHours();
      setStartTime(`${String(currentHour).padStart(2, "0")}:00`);
      setEndTime(`${String((currentHour + 1) % 24).padStart(2, "0")}:00`);
    }
  }, [showTimeRangePicker]);

  const handleOpenTimeRangePicker = () => {
    setIsExpanded(false);
    setShowTimeRangePicker(true);
  };

  const handleGenerateNote = async () => {
    if (!session?.notes?.generateNote) return;

    try {
      // Parse the dateString to get the correct date
      const [year, month, day] = dateString.split("-").map(Number);
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const startDate = new Date(year, month - 1, day, startHour, startMin);
      const endDate = new Date(year, month - 1, day, endHour, endMin);

      setShowTimeRangePicker(false);

      const note = await session.notes.generateNote(
        undefined,
        startDate,
        endDate,
      );
      if (note?.id) {
        setLocation(`/note/${note.id}`);
      }
    } catch (err) {
      console.error("[NotesTab] Failed to generate note:", err);
    }
  };

  const handleCreateManualNote = async () => {
    if (!session?.notes?.createManualNote) return;
    setIsExpanded(false);

    try {
      const note = await session.notes.createManualNote("New Note", "");
      // Navigate to the note editor
      setLocation(`/note/${note.id}`);
    } catch (err) {
      console.error("[NotesTab] Failed to create note:", err);
    }
  };

  // Floating Action Button JSX (rendered directly, not as a component)
  const floatingActions = (
    <div
      ref={fabRef}
      className="fixed bottom-8 right-6 z-40 flex flex-col items-end gap-3"
    >
      {/* Expanded options */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Generate Note option */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              onClick={handleOpenTimeRangePicker}
              disabled={generating}
              className="flex items-center gap-[0px] px-[20px] py-[7px] bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              <span className="text-[14px] font-bold text-[#18181B] dark:text-white whitespace-nowrap">
                Generate note
              </span>
              <div className="w-8 h-8 rounded-full  dark:bg-zinc-700 flex items-center justify-center">
                <Sparkles
                  size={16}
                  className="text-[#18181B] dark:text-zinc-300"
                />
              </div>
            </motion.button>

            {/* Add Note option */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={handleCreateManualNote}
              className="flex items-center  gap-[0px] px-[20px] py-[7px] bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <span className="text-[14px] font-bold text-[#18181B] dark:text-white whitespace-nowrap">
                Add note
              </span>
              <div className="w-8 h-8 rounded-full dark:bg-zinc-700 flex items-center justify-center">
                <PencilLine
                  size={16}
                  className="text-[#18181B] dark:text-zinc-300"
                />
              </div>
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={generating}
        className="w-14 h-14 rounded-full bg-zinc-900 dark:bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
      >
        {generating ? (
          <Loader2
            size={24}
            className="text-white dark:text-zinc-900 animate-spin"
          />
        ) : isExpanded ? (
          <X size={24} className="text-white dark:text-zinc-900" />
        ) : (
          <PencilLine size={24} className="text-white dark:text-zinc-900" />
        )}
      </button>
    </div>
  );

  const handleNoteClick = (note: Note) => {
    setLocation(`/note/${note.id}`);
  };

  // Time Range Picker Drawer JSX (rendered directly, not as a component)
  const timeRangePickerDrawer = (
    <Drawer.Root
      open={showTimeRangePicker}
      onOpenChange={setShowTimeRangePicker}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto outline-none border-t border-zinc-100 dark:border-zinc-800">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-4 mb-2" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4">
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
              Generate Summary
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Select a time range to generate a summary
            </Drawer.Description>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            <div className="space-y-6">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Select a time range from the transcript to generate a focused
                summary note.
              </p>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Start Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                    <Clock
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    End Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                    <Clock
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Drawer.Close asChild>
                  <button className="flex-1 py-4 rounded-xl font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Cancel
                  </button>
                </Drawer.Close>
                <button
                  onClick={handleGenerateNote}
                  disabled={generating}
                  className={clsx(
                    "flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors",
                    generating
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100",
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Safe area padding for mobile */}
          <div className="h-safe-area-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );

  // Empty state
  if (notes.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-64 text-center px-6 mt-12">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
            <FileText size={24} />
          </div>
          <h3 className="text-zinc-900 dark:text-white font-medium mb-1">
            No notes yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-[240px]">
            Create a note manually or generate one from the transcript using the
            button below.
          </p>
        </div>

        {floatingActions}
        {timeRangePickerDrawer}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-32">
      <div className="p-4 pt-6">
        {/* Masonry Grid */}
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3 }}>
          <Masonry gutter="10px">
            {notes.map((note) => (
              <div key={note.id} className="w-full">
                <NoteCard note={note} onClick={() => handleNoteClick(note)} />
              </div>
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </div>

      {floatingActions}
      {timeRangePickerDrawer}
    </div>
  );
}
