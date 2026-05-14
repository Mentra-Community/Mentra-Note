/**
 * DeleteTranscriptDrawer
 *
 * Bottom-sheet confirmation for deleting one or more transcript days.
 * Computes a warning message that flags any conversations whose linked
 * transcript would be lost.
 */

import { useMemo } from "react";
import { Drawer } from "vaul";

interface ConversationLike {
  startTime?: number | string | Date | null;
}

interface DeleteTranscriptDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** ISO date strings (yyyy-MM-dd) being deleted */
  dates: string[];
  /** All conversations — used to compute the "X conversations will lose..." warning */
  conversations?: ConversationLike[];
}

function toDateKey(input: number | string | Date | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DeleteTranscriptDrawer({
  open,
  onClose,
  onConfirm,
  dates,
  conversations = [],
}: DeleteTranscriptDrawerProps) {
  const isSingle = dates.length === 1;
  const title = isSingle ? "Delete Transcript?" : "Delete Transcripts?";
  const confirmLabel = isSingle ? "Delete Transcript" : "Delete Transcripts";

  const warning = useMemo(() => {
    const dateSet = new Set(dates);
    const affected = conversations.filter((c) => {
      const key = toDateKey(c.startTime);
      return key !== null && dateSet.has(key);
    });
    if (affected.length > 0) {
      return `${affected.length} ${affected.length === 1 ? "conversation" : "conversations"} will lose ${affected.length === 1 ? "its" : "their"} linked transcript. This cannot be undone.`;
    }
    return "This will permanently delete the transcript data. This cannot be undone.";
  }, [dates, conversations]);

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[6px] z-50" />
        <Drawer.Content className="flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 bg-[#FAFAF9] outline-none">
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-9 h-1 rounded-xs bg-[#D6D3D1] shrink-0" />
          </div>
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Confirm transcript deletion</Drawer.Description>
          <div className="px-6 pb-10">
            <div className="pb-1">
              <span className="text-xl leading-[26px] text-[#1C1917] font-red-hat font-extrabold tracking-[-0.02em]">
                {title}
              </span>
            </div>
            <p className="text-[14px] leading-5 text-[#78716C] font-red-hat pb-6">{warning}</p>
            <button
              onClick={onConfirm}
              className="flex items-center justify-center w-full rounded-xl bg-[#DC2626] p-3.5 mb-3"
            >
              <span className="text-[16px] leading-5 text-white font-red-hat font-bold">
                {confirmLabel}
              </span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-full rounded-xl border border-[#E7E5E4] p-3.5"
            >
              <span className="text-[16px] leading-5 text-[#1C1917] font-red-hat font-bold">
                Cancel
              </span>
            </button>
          </div>
          <div className="h-safe-area-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
