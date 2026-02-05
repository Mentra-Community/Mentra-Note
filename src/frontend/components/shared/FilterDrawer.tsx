/**
 * FilterDrawer - Filter & sort options for the folder list
 *
 * Shows:
 * - Filters: All files, Archived, Trash (with counts)
 * - Views: All Notes, Favorites (with counts)
 *
 * Uses vaul for proper spring physics and backdrop blur.
 *
 * Reference: figma-design/src/app/views/FolderList.tsx L226-248
 */

import { clsx } from "clsx";
import {
  X,
  FolderOpen,
  Archive,
  Trash2,
  Layers,
  Star,
  Check,
  ChevronDown,
} from "lucide-react";
import { Drawer } from "vaul";

export type FilterType = "all" | "archived" | "trash";
export type ViewType = "folders" | "all_notes" | "favorites";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilter: FilterType;
  activeView: ViewType;
  onFilterChange: (filter: FilterType) => void;
  onViewChange: (view: ViewType) => void;
  counts: {
    all: number;
    archived: number;
    trash: number;
    allNotes: number;
    favorites: number;
  };
}

interface FilterOptionProps {
  icon: typeof FolderOpen;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterOption({
  icon: Icon,
  label,
  count,
  isActive,
  onClick,
}: FilterOptionProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between p-4 rounded-xl transition-colors",
        isActive
          ? "bg-zinc-100 dark:bg-[#3f4147]"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={20}
          className={clsx(
            isActive
              ? "text-zinc-900 dark:text-white"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        />
        <span
          className={clsx(
            "font-medium",
            isActive
              ? "text-zinc-900 dark:text-white"
              : "text-zinc-700 dark:text-zinc-300"
          )}
        >
          {label}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">({count})</span>
      </div>
      {isActive && (
        <Check size={18} className="text-zinc-900 dark:text-white" />
      )}
    </button>
  );
}

export function FilterDrawer({
  isOpen,
  onClose,
  activeFilter,
  activeView,
  onFilterChange,
  onViewChange,
  counts,
}: FilterDrawerProps) {
  const handleFilterClick = (filter: FilterType) => {
    onFilterChange(filter);
    onClose();
  };

  const handleViewClick = (view: ViewType) => {
    onViewChange(view);
    onClose();
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-white dark:bg-[#313338] flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto outline-none border-t border-zinc-100 dark:border-[#3f4147]">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-4 mb-2" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4">
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
              Filter & sort
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Filter and sort your notes and folders
            </Drawer.Description>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-8 space-y-6">
            {/* Sort (placeholder - can expand later) */}
            <div>
              <button className="flex items-center justify-between w-full py-2 text-zinc-700 dark:text-zinc-300">
                <span>Date created</span>
                <ChevronDown size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Filters Section */}
            <div className="space-y-1">
              <FilterOption
                icon={FolderOpen}
                label="All files"
                count={counts.all}
                isActive={activeFilter === "all" && activeView === "folders"}
                onClick={() => {
                  handleFilterClick("all");
                  handleViewClick("folders");
                }}
              />
              <FilterOption
                icon={Archive}
                label="Archived"
                count={counts.archived}
                isActive={activeFilter === "archived"}
                onClick={() => handleFilterClick("archived")}
              />
              <FilterOption
                icon={Trash2}
                label="Trash"
                count={counts.trash}
                isActive={activeFilter === "trash"}
                onClick={() => handleFilterClick("trash")}
              />
            </div>

            {/* Views Section */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 px-1 mb-2">
                Views
              </p>
              <FilterOption
                icon={Layers}
                label="All Notes"
                count={counts.allNotes}
                isActive={activeView === "all_notes"}
                onClick={() => handleViewClick("all_notes")}
              />
              <FilterOption
                icon={Star}
                label="Favorites"
                count={counts.favorites}
                isActive={activeView === "favorites"}
                onClick={() => handleViewClick("favorites")}
              />
            </div>
          </div>

          {/* Safe area padding for mobile */}
          <div className="h-safe-area-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
