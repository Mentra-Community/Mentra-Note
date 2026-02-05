/**
 * QuickActionsDrawer - Bottom drawer for quick note actions
 *
 * Uses vaul for proper spring physics and backdrop blur.
 *
 * Shows:
 * - Add Note (creates blank note)
 * - Generate note from current hour (opens time picker)
 *
 * Can be triggered from:
 * - Plus FAB on Notes tab
 * - Lightning button in bottom nav
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { clsx } from "clsx";
import { X, FileText, Sparkles, Clock, Loader2 } from "lucide-react";
import { Drawer } from "vaul";
import { useSynced } from "../../hooks/useSynced";
import type { SessionI } from "../../../shared/types";

interface QuickActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionsDrawer({
  isOpen,
  onClose,
}: QuickActionsDrawerProps) {
  const { userId } = useMentraAuth();
  const { session } = useSynced<SessionI>(userId || "");
  const [, setLocation] = useLocation();

  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const generating = session?.notes?.generating ?? false;

  // Set default times to current hour when opening time picker
  useEffect(() => {
    if (showTimeRangePicker) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = currentHour;
      const endHour = currentHour + 1;

      setStartTime(`${String(startHour).padStart(2, "0")}:00`);
      setEndTime(`${String(endHour % 24).padStart(2, "0")}:00`);
    }
  }, [showTimeRangePicker]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setShowTimeRangePicker(false);
    }
  }, [isOpen]);

  const handleAddNote = async () => {
    if (!session?.notes?.createManualNote) return;

    try {
      const note = await session.notes.createManualNote("New Note", "");
      onClose();
      setLocation(`/note/${note.id}`);
    } catch (err) {
      console.error("[QuickActionsDrawer] Failed to create note:", err);
    }
  };

  const handleGenerateNote = async () => {
    if (!session?.notes?.generateNote) return;

    try {
      const now = new Date();
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        startHour,
        startMin,
      );
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        endHour,
        endMin,
      );

      const note = await session.notes.generateNote(
        undefined,
        startDate,
        endDate,
      );
      onClose();
      if (note?.id) {
        setLocation(`/note/${note.id}`);
      }
    } catch (err) {
      console.error("[QuickActionsDrawer] Failed to generate note:", err);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto outline-none border-t border-zinc-100 dark:border-zinc-800">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-4 mb-2" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4">
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
              {showTimeRangePicker ? "Generate Summary" : "Quick Actions"}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              {showTimeRangePicker
                ? "Select a time range to generate a summary"
                : "Quick actions for notes"}
            </Drawer.Description>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {showTimeRangePicker ? (
              // Time Range Picker View
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
                  <button
                    onClick={() => setShowTimeRangePicker(false)}
                    className="flex-1 py-4 rounded-xl font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Back
                  </button>
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
            ) : (
              // Quick Actions List View
              <div className="space-y-2">
                {/* Add Note */}
                <button
                  onClick={handleAddNote}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <FileText
                      size={20}
                      className="text-zinc-600 dark:text-zinc-400"
                    />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white block">
                      Add Note
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Create a new blank note
                    </span>
                  </div>
                </button>

                {/* Generate from time */}
                <button
                  onClick={() => setShowTimeRangePicker(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Sparkles
                      size={20}
                      className="text-zinc-600 dark:text-zinc-400"
                    />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white block">
                      Generate note from current hour
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      AI summary from your transcript
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Safe area padding for mobile */}
          <div className="h-safe-area-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
