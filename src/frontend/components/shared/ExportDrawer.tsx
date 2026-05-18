/**
 * ExportDrawer — Bottom sheet for exporting notes/conversations/transcripts
 *
 * Shows content toggles and export destination options (Clipboard, Email).
 * Uses vaul Drawer under the hood.
 */

import { useState, useCallback } from "react";
import { Drawer } from "vaul";
import { ClipboardPlusIcon, EmailEnvelopeIcon } from "./custom-icons";

export interface ExportOptions {
  includeContent: boolean;
  includeTranscript: boolean;
  includeLinkedNote: boolean;
  destination: "clipboard" | "email";
}

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** "note" | "conversation" | "transcript" */
  itemType: "note" | "conversation" | "transcript";
  /** Title of single item, or summary for batch */
  itemLabel: string;
  /** Number of items being exported */
  count: number;
  /** Callback when export is triggered */
  onExport: (options: ExportOptions) => Promise<void>;
  /** How many selected conversations have no linked AI note (shown as warning) */
  missingNoteCount?: number;
}

export function ExportDrawer({
  isOpen,
  onClose,
  itemType,
  itemLabel,
  count,
  onExport,
  missingNoteCount = 0,
}: ExportDrawerProps) {
  const includeContent = true; // Always included
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [includeLinkedNote, setIncludeLinkedNote] = useState(false);
  const [destination, setDestination] = useState<ExportOptions["destination"]>("clipboard");
  const [isExporting, setIsExporting] = useState(false);

  const typeLabel = itemType === "note" ? "Note" : itemType === "conversation" ? "Conversation" : "Transcript";
  const title = count === 1 ? `Export ${typeLabel}` : `Export ${count} ${typeLabel}s`;

  const contentToggleLabel = itemType === "note" ? "Note Content" : itemType === "conversation" ? "Conversation Summary" : "Transcript Content";
  const contentToggleDesc = itemType === "note" ? "Summary, decisions, and action items" : itemType === "conversation" ? "AI-generated summary" : "Full transcript text";

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExport({ includeContent, includeTranscript, includeLinkedNote, destination });
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [onExport, includeContent, includeTranscript, includeLinkedNote, destination, onClose]);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[6px] z-50" />
        <Drawer.Content className="flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 bg-[#FAFAF9] outline-none">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-9 h-1 rounded-xs bg-[#D6D3D1] shrink-0" />
          </div>

          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Export options</Drawer.Description>

          <div className="px-6 pb-10">
            {/* Header */}
            <div className="pb-1">
              <span className="text-xl leading-[26px] text-[#1C1917] font-red-hat font-extrabold tracking-[-0.02em]">
                {title}
              </span>
            </div>

            {/* Subtitle */}
            <div className=" py-4 text-[18px] leading-[18px] text-[#A8A29E] font-red-hat">
              {itemLabel}
            </div>

            

            {/* Content — always included (non-toggleable) */}
            {/* <div className="flex items-center justify-between py-3.5 border-b border-b-[#E7E5E4]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-5 text-[#1C1917] font-red-hat font-semibold">
                  {contentToggleLabel}
                </span>
                <span className="text-xs leading-4 text-[#A8A29E] font-red-hat">
                  {contentToggleDesc}
                </span>
              </div>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div> */}

            {/* Notes: Linked Conversation + Transcript toggles hidden — the
                conversations UI is dormant so there's nothing to link to. */}

            {/* Conversations: Linked Transcript toggle + Linked AI Note toggle */}
            {itemType === "conversation" && (
              <>
                <div className="flex items-center justify-between py-3.5 border-b border-b-[#E7E5E4]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] leading-5 text-[#1C1917] font-red-hat font-semibold">
                      Linked Transcript
                    </span>
                    <span className="text-xs leading-4 text-[#A8A29E] font-red-hat">
                      Full conversation with speaker labels
                    </span>
                  </div>
                  <ToggleSwitch checked={includeTranscript} onChange={setIncludeTranscript} />
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] leading-5 text-[#1C1917] font-red-hat font-semibold">
                      Linked AI Note
                    </span>
                    <span className="text-xs leading-4 text-[#A8A29E] font-red-hat">
                      AI-generated note from conversation
                    </span>
                    {includeLinkedNote && missingNoteCount > 0 && (
                      <span className="text-xs leading-4 text-[#DC2626] font-red-hat font-medium mt-0.5">
                        {missingNoteCount} {missingNoteCount === 1 ? "conversation has" : "conversations have"} no AI note — will be skipped
                      </span>
                    )}
                  </div>
                  <ToggleSwitch checked={includeLinkedNote} onChange={setIncludeLinkedNote} />
                </div>
              </>
            )}

            {/* Section: Export to */}
            <div className="tracking-[0.08em] uppercase pt-4 pb-3 text-[11px] leading-3.5 text-[#A8A29E] font-red-hat font-bold">
              Export to
            </div>

            <div className="flex items-center gap-3">
              <DestinationCard
                icon={<ClipboardIcon selected={destination === "clipboard"} />}
                label="Clipboard"
                selected={destination === "clipboard"}
                onClick={() => setDestination("clipboard")}
              />
              <DestinationCard
                icon={<EmailIcon selected={destination === "email"} />}
                label="Email"
                selected={destination === "email"}
                onClick={() => setDestination("email")}
              />
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={isExporting || (!includeContent && !includeTranscript && !includeLinkedNote)}
              className="flex items-center justify-center w-full mt-5 rounded-xl bg-[#1C1917] p-3.5 disabled:opacity-50"
            >
              <span className="text-[16px] leading-5 text-[#FAFAF9] font-red-hat font-bold">
                {isExporting ? "Exporting..." : title}
              </span>
            </button>
          </div>

          {/* Safe area */}
          <div className="h-safe-area-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Toggle Switch ──

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-[26px] flex items-center rounded-[13px] shrink-0 p-0.5 transition-colors duration-200 ${
        checked ? "bg-[#2563EB] justify-end" : "bg-[#E7E5E4] justify-start"
      }`}
    >
      <div className="w-[22px] h-[22px] rounded-[11px] bg-[#FAFAF9] shrink-0" />
    </button>
  );
}

// ── Destination Card ──

function DestinationCard({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center rounded-xl py-3.5 gap-1.5 w-[76px] shrink-0 ${
        selected
          ? "bg-[#F5F5F4] border-[1.5px] border-[#1C1917]"
          : "bg-[#F5F5F4] border-[1.5px] border-transparent"
      }`}
    >
      {icon}
      <span
        className={`text-[11px] leading-3.5 font-red-hat font-semibold ${
          selected ? "text-[#1C1917]" : "text-[#78716C]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ── Icons ──

function ClipboardIcon({ selected }: { selected: boolean }) {
  return <ClipboardPlusIcon stroke={selected ? "#1C1917" : "#78716C"} />;
}

function EmailIcon({ selected }: { selected: boolean }) {
  return <EmailEnvelopeIcon stroke={selected ? "#1C1917" : "#78716C"} />;
}
