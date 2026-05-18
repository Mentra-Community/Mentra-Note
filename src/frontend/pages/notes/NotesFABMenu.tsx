/**
 * NotesFABMenu - Expandable floating action button for Notes page
 *
 * Default: Red "+" button
 * Expanded: X close button + stacked action pills (Ask AI, Create folder, Add manual note)
 *
 * Uses CSS transitions only (no framer-motion) for zero-lag first press.
 */

import { useState } from "react";
import { FolderPlusIcon, DocumentPlusIcon, PlusIcon } from "../../components/shared/custom-icons";

interface NotesFABMenuProps {
  onAddNote: () => void;
  onAskAI: () => void;
  onCreateFolder: () => void;
  transcriptionPaused?: boolean;
}

export function NotesFABMenu({
  onAddNote,
  onAskAI,
  onCreateFolder,
  transcriptionPaused = false,
}: NotesFABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMicOn = !transcriptionPaused;

  const actions = [
    // {
    //   id: "ai",
    //   label: "Ask AI",
    //   onClick: () => { onAskAI(); setIsOpen(false); },
    //   bg: "bg-[#FAFAF9]",
    //   textColor: "text-[#1C1917]",
    //   fontWeight: "font-semibold",
    //   icon: (
    //     <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    //       <path d="M12 2l2.09 6.26L20.18 9l-4.91 3.74L17.18 19 12 15.27 6.82 19l1.91-6.26L3.82 9l6.09-.74z" stroke="#1C1917" strokeWidth="1.75" strokeLinejoin="round" />
    //     </svg>
    //   ),
    // },
    {
      id: "folder",
      label: "Create folder",
      onClick: () => { onCreateFolder(); setIsOpen(false); },
      bg: "bg-[#FAFAF9]",
      textColor: "text-[#1C1917]",
      fontWeight: "font-semibold",
      icon: (
        <FolderPlusIcon />
      ),
    },
    {
      id: "note",
      label: "Add manual note",
      onClick: () => { onAddNote(); setIsOpen(false); },
      bg: "bg-[#FEE2E2]",
      textColor: "text-[#DC2626]",
      fontWeight: "font-bold",
      icon: (
        <DocumentPlusIcon stroke="#DC2626" />
      ),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: "rgba(0,0,0,0.2)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.15s ease",
        }}
      />

      {/* FAB container */}
      <div className="absolute bottom-[25px] right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-none">
        {/* Action pills */}
        {actions.map((action, i) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`flex items-center gap-2.5 py-2.5 px-[18px] h-11 ${action.bg} [box-shadow:#0000001A_0px_2px_12px] rounded-xl`}
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.92)",
              pointerEvents: isOpen ? "auto" : "none",
              transition: `opacity 0.18s ease ${i * 0.04}s, transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.04}s`,
            }}
          >
            <span className={`text-[15px] leading-5 ${action.textColor} font-red-hat ${action.fontWeight}`}>
              {action.label}
            </span>
            {action.icon}
          </button>
        ))}

        {/* Main FAB row — mic indicator + FAB button */}
        <div className="flex items-center gap-2.5 pointer-events-auto">


          {/* FAB button */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="flex items-center justify-center w-[52px] h-[52px] rounded-2xl bg-[#DC2626] [box-shadow:#DC262640_0px_4px_16px]"
            style={{
              transform: `rotate(${isOpen ? 45 : 0}deg)`,
              transition: "transform 0.2s ease-in-out",
            }}
          >
            <PlusIcon size={22} stroke="#FFFFFF" />
          </button>
        </div>
      </div>
    </>
  );
}
