import React, { useState } from "react";
import { DailyFolder } from "../../lib/mockData";
import { format } from "date-fns";
import { clsx } from "clsx";
import { FileText, MessageSquare, Sparkles, Star, X } from "lucide-react";
import { TranscriptionsTab } from "../tabs/TranscriptionsTab";
import { NotesTab } from "../tabs/NotesTab";
import { AIChatTab } from "../tabs/AIChatTab";

interface FolderDetailProps {
  folder: DailyFolder;
  onClose?: () => void;
}

type TabType = "transcriptions" | "notes" | "ai";

export const FolderDetail: React.FC<FolderDetailProps> = ({
  folder,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("notes");

  const tabs = [
    {
      id: "transcriptions" as const,
      label: "Transcript",
      icon: MessageSquare,
      count: folder.transcriptions.length,
    },
    {
      id: "notes" as const,
      label: "Notes",
      icon: FileText,
      count: folder.notes.length,
    },
    { id: "ai" as const, label: "AI Chat", icon: Sparkles },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {folder.isToday ? "Today" : format(folder.date, "EEEE, MMMM d")}
              </h2>
              {folder.isStarred && (
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              )}
              {folder.isTranscribing && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {format(folder.date, "yyyy")} • {folder.transcriptions.length}{" "}
              transcription segments
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors md:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={clsx(
                    "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
                    activeTab === tab.id
                      ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                      : "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-400",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "transcriptions" && (
          <div className="h-full overflow-y-auto">
            <TranscriptionsTab transcriptions={folder.transcriptions} />
          </div>
        )}
        {activeTab === "notes" && (
          <div className="h-full overflow-y-auto">
            <NotesTab notes={folder.notes} />
          </div>
        )}
        {activeTab === "ai" && <AIChatTab date={folder.date} />}
      </div>
    </div>
  );
};
