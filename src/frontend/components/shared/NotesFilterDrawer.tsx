/**
 * NotesFilterDrawer - Filter & sort options for notes
 *
 * Renders inside BottomDrawer with:
 * - Sort by (Most recent / Oldest first)
 * - Show filters (All notes / Favourites / Archived / Trash)
 */

import { useState, useEffect, type ReactNode } from "react";
import { BottomDrawer } from "./BottomDrawer";
import {
  DocumentPageIcon,
  FavoriteStarIcon,
  ArchiveIcon,
  TrashIcon,
  CloseIcon,
  ChevronDownIcon,
  CheckIcon,
} from "./custom-icons";

export type NoteSortBy = "recent" | "oldest";
export type NoteShowFilter = "all" | "favourites" | "archived" | "trash";

export interface NoteFilters {
  sortBy: NoteSortBy;
  showFilter: NoteShowFilter;
}

interface NotesFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: NoteSortBy;
  showFilter: NoteShowFilter;
  onApply: (filters: NoteFilters) => void;
}

const SORT_OPTIONS: { value: NoteSortBy; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest first" },
];

const SHOW_OPTIONS: { value: NoteShowFilter; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All notes", icon: <DocumentPageIcon /> },
  { value: "favourites", label: "Favourites", icon: <FavoriteStarIcon /> },
  { value: "archived", label: "Archived", icon: <ArchiveIcon /> },
  { value: "trash", label: "Trash", icon: <TrashIcon size={18} stroke="currentColor" strokeWidth={2} /> },
];

export function NotesFilterDrawer({
  isOpen,
  onClose,
  sortBy: initialSortBy,
  showFilter: initialShowFilter,
  onApply,
}: NotesFilterDrawerProps) {
  const [sortBy, setSortBy] = useState<NoteSortBy>(initialSortBy);
  const [showFilter, setShowFilter] = useState<NoteShowFilter>(initialShowFilter);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSortBy(initialSortBy);
      setShowFilter(initialShowFilter);
      setSortOpen(false);
    }
  }, [isOpen]);

  const applySortBy = (value: NoteSortBy) => {
    setSortBy(value);
    setSortOpen(false);
    onApply({ sortBy: value, showFilter });
  };

  const applyShowFilter = (value: NoteShowFilter) => {
    setShowFilter(value);
    onApply({ sortBy, showFilter: value });
    onClose();
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-[20px] leading-[26px] text-[#1C1917] font-red-hat font-bold">
          Filter & sort
        </div>
        <button onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {/* Sort by */}
      <div className="border-b border-[#F5F5F4]">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="flex items-center justify-between w-full py-3"
        >
          <span className="text-[15px] leading-5 text-[#1C1917] font-red-hat font-semibold">
            Sort by
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[14px] leading-[18px] text-[#78716C] font-red-hat">
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            </span>
            <ChevronDownIcon style={{ transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
          </div>
        </button>
        {sortOpen && (
          <div className="pb-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => applySortBy(option.value)}
                className="flex items-center justify-between w-full py-2.5 pl-4"
              >
                <span className={`text-[14px] leading-[18px] font-red-hat font-medium ${sortBy === option.value ? "text-[#1C1917]" : "text-[#78716C]"}`}>
                  {option.label}
                </span>
                {sortBy === option.value && (
                  <CheckIcon size={18} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show */}
      <div className="text-[11px] tracking-widest uppercase leading-3.5 text-[#A8A29E] font-red-hat font-bold mt-5 mb-3">
        Show
      </div>
      {SHOW_OPTIONS.map((option) => {
        const isSelected = showFilter === option.value;
        return (
          <button
            key={option.value}
            onClick={() => applyShowFilter(option.value)}
            className="flex items-center w-full py-2.5 gap-2.5"
          >
            <div className={isSelected ? "text-[#1C1917]" : "text-[#78716C]"}>
              {option.icon}
            </div>
            <span className={`grow text-left text-[14px] leading-[18px] font-red-hat font-medium ${isSelected ? "text-[#1C1917]" : "text-[#78716C]"}`}>
              {option.label}
            </span>
            {isSelected && <CheckIcon size={18} />}
          </button>
        );
      })}
    </BottomDrawer>
  );
}
