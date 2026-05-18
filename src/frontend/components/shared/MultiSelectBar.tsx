/**
 * MultiSelectBar — Fixed bottom action bar during multi-select mode
 *
 * Replaces the tab bar. Shows contextual actions (Export, Move, Favorite, Delete).
 * Actions vary by context: notes get all 4, conversations get 3 (no Move),
 * transcripts get 2 (Export + Delete only).
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface MultiSelectAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface MultiSelectBarProps {
  actions: MultiSelectAction[];
}

export function MultiSelectBar({ actions }: MultiSelectBarProps) {
  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      exit={{ y: 80 }}
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around pt-3.5 pb-10 bg-[#FAFAF9] border-t border-t-[#E7E5E4] px-6"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          className={`flex flex-col items-center gap-1 ${action.disabled ? "opacity-30" : ""}`}
        >
          {action.icon}
          <span
            className={`text-[11px] leading-3.5 font-red-hat font-semibold ${
              action.variant === "danger" ? "text-[#DC2626]" : "text-[#1C1917]"
            }`}
          >
            {action.label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}

// ── Pre-built icon components for actions ──
// These re-export shared icons with the sizing/colors used by the multi-select bar,
// so existing imports `{ ExportIcon, DeleteIcon, ... } from "./MultiSelectBar"` keep working.

import {
  ExportIcon as ExportIconBase,
  TrashIcon,
  MoveFolderIcon,
  MergeIcon as MergeIconBase,
  FavoriteIcon as FavoriteIconBase,
} from "./custom-icons";

export const ExportIcon = () => <ExportIconBase size={22} stroke="#1C1917" strokeWidth={1.75} />;
export const MoveIcon = () => <MoveFolderIcon size={22} />;
export const MergeIcon = () => <MergeIconBase size={22} />;
export const FavoriteIcon = () => <FavoriteIconBase size={22} />;
export const DeleteIcon = () => <TrashIcon size={22} stroke="#DC2626" strokeWidth={1.75} />;
