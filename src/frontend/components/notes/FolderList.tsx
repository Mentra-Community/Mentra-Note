import React, { useState } from "react";
import { DailyFolder } from "../../lib/mockData";
import { format, isToday, isYesterday } from "date-fns";
import { clsx } from "clsx";
import { Star, Circle, Filter, X, ChevronDown, FileText } from "lucide-react";
import { Drawer } from "vaul";

interface FolderListProps {
  folders: DailyFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folder: DailyFolder) => void;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showTranscribingOnly, setShowTranscribingOnly] = useState(false);

  const formatFolderDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
  };

  const filteredFolders = folders.filter((folder) => {
    if (showStarredOnly && !folder.isStarred) return false;
    if (showTranscribingOnly && !folder.isTranscribing) return false;
    return true;
  });

  const activeFilters = [showStarredOnly, showTranscribingOnly].filter(
    Boolean,
  ).length;

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Days
          </h2>
          <Drawer.Root open={filterOpen} onOpenChange={setFilterOpen}>
            <Drawer.Trigger asChild>
              <button
                className={clsx(
                  "p-2 rounded-lg transition-colors relative",
                  activeFilters > 0
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500",
                )}
              >
                <Filter size={16} />
                {activeFilters > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {activeFilters}
                  </span>
                )}
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
              <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl h-[40vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-t-2xl flex-1">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700 mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Filters
                    </h3>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setShowStarredOnly(!showStarredOnly)}
                      className={clsx(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                        showStarredOnly
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Star
                          size={18}
                          className={
                            showStarredOnly
                              ? "text-yellow-500"
                              : "text-zinc-400"
                          }
                        />
                        <span className="font-medium text-zinc-900 dark:text-white">
                          Starred Only
                        </span>
                      </div>
                      <div
                        className={clsx(
                          "w-5 h-5 rounded-full border-2 transition-all",
                          showStarredOnly
                            ? "bg-yellow-500 border-yellow-500"
                            : "border-zinc-300 dark:border-zinc-600",
                        )}
                      />
                    </button>

                    <button
                      onClick={() =>
                        setShowTranscribingOnly(!showTranscribingOnly)
                      }
                      className={clsx(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                        showTranscribingOnly
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Circle
                          size={18}
                          className={
                            showTranscribingOnly
                              ? "text-emerald-500 fill-emerald-500"
                              : "text-zinc-400"
                          }
                        />
                        <span className="font-medium text-zinc-900 dark:text-white">
                          Active Only
                        </span>
                      </div>
                      <div
                        className={clsx(
                          "w-5 h-5 rounded-full border-2 transition-all",
                          showTranscribingOnly
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-zinc-300 dark:border-zinc-600",
                        )}
                      />
                    </button>
                  </div>

                  {activeFilters > 0 && (
                    <button
                      onClick={() => {
                        setShowStarredOnly(false);
                        setShowTranscribingOnly(false);
                      }}
                      className="w-full mt-6 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>

        {/* Active filters display */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-2">
            {showStarredOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full font-medium">
                <Star size={10} fill="currentColor" /> Starred
              </span>
            )}
            {showTranscribingOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium">
                <Circle size={10} fill="currentColor" /> Active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFolders.map((folder) => {
          const isSelected = folder.id === selectedFolderId;

          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              className={clsx(
                "w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-800/50 transition-all",
                isSelected
                  ? "bg-white dark:bg-zinc-900 border-l-2 border-l-zinc-900 dark:border-l-white"
                  : "hover:bg-white/50 dark:hover:bg-zinc-900/50 border-l-2 border-l-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        isSelected
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {formatFolderDate(folder.date)}
                    </span>
                    {folder.isStarred && (
                      <Star
                        size={12}
                        className="text-yellow-500 fill-yellow-500"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                    <span>{folder.transcriptions.length} segments</span>
                    <span>{folder.notes.length} notes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {folder.isTranscribing && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <ChevronDown
                    size={16}
                    className={clsx(
                      "text-zinc-400 transition-transform",
                      isSelected && "-rotate-90",
                    )}
                  />
                </div>
              </div>
            </button>
          );
        })}

        {filteredFolders.length === 0 && folders.length === 0 && (
          <div className="p-8 text-center text-zinc-400 dark:text-zinc-600">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No notes yet</p>
            <p className="text-xs">
              Notes will appear here after your first meeting.
            </p>
          </div>
        )}
        {filteredFolders.length === 0 && folders.length > 0 && (
          <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">
            No days match your filters
          </div>
        )}
      </div>
    </div>
  );
};
