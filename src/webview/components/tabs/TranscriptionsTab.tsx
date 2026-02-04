import React, { useState } from "react";
import { TranscriptionSegment } from "../../lib/mockData";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

interface TranscriptionsTabProps {
  transcriptions: TranscriptionSegment[];
}

export const TranscriptionsTab: React.FC<TranscriptionsTabProps> = ({
  transcriptions,
}) => {
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());

  // Parse time string (e.g., "03:26 PM" or "15:26") and return hour key
  const getHourKey = (timeStr: string): string => {
    if (!timeStr) return "00:00";

    // Check if it's 12-hour format with AM/PM
    const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10);
      const ampm = ampmMatch[3].toUpperCase();

      // Convert to 24-hour for sorting, but keep AM/PM for display
      if (ampm === "PM" && hour !== 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;

      return `${hour.toString().padStart(2, "0")}:00 ${ampm === "PM" || hour >= 12 ? "PM" : "AM"}`;
    }

    // 24-hour format
    const hour = parseInt(timeStr.split(":")[0], 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:00 ${ampm}`;
  };

  // Get display hour from hour key
  const formatHourDisplay = (hourKey: string): string => {
    // hourKey is like "15:00 PM" or "03:00 AM"
    const match = hourKey.match(/(\d{2}):00\s*(AM|PM)/i);
    if (match) {
      const hour24 = parseInt(match[1], 10);
      const ampm = match[2].toUpperCase();
      const hour12 = hour24 % 12 || 12;
      return `${hour12} ${ampm}`;
    }
    return hourKey;
  };

  // Group transcriptions by hour
  const groupedTranscriptions = transcriptions.reduce(
    (acc, segment) => {
      const hourKey = getHourKey(segment.time);
      if (!acc[hourKey]) {
        acc[hourKey] = [];
      }
      acc[hourKey].push(segment);
      return acc;
    },
    {} as Record<string, TranscriptionSegment[]>,
  );

  // Sort hours chronologically (by 24-hour value)
  const hours = Object.keys(groupedTranscriptions).sort((a, b) => {
    const hourA = parseInt(a.split(":")[0], 10);
    const hourB = parseInt(b.split(":")[0], 10);
    return hourA - hourB;
  });

  const toggleHour = (hourKey: string) => {
    const newExpanded = new Set(expandedHours);
    if (newExpanded.has(hourKey)) {
      newExpanded.delete(hourKey);
    } else {
      newExpanded.add(hourKey);
    }
    setExpandedHours(newExpanded);
  };

  const getTitle = (segments: TranscriptionSegment[]) => {
    const firstText = segments[0]?.text || "";
    if (firstText.length > 55) {
      return firstText.substring(0, 55) + "...";
    }
    return firstText;
  };

  return (
    <div className="flex flex-col pb-32 w-full">
      <div className="py-2">
        {hours.map((hourKey) => {
          const segments = groupedTranscriptions[hourKey];
          const isExpanded = expandedHours.has(hourKey);
          const title = getTitle(segments);

          return (
            <div
              key={hourKey}
              className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <button
                onClick={() => toggleHour(hourKey)}
                className={clsx(
                  "w-full flex items-center py-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-left px-6",
                  isExpanded &&
                    "sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 shadow-sm",
                )}
              >
                {/* Time Column */}
                <div className="w-20 shrink-0 flex flex-col items-start pt-0.5">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {formatHourDisplay(hourKey)}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {segments.length}{" "}
                    {segments.length === 1 ? "segment" : "segments"}
                  </span>
                </div>

                {/* Content Preview */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {title}
                  </p>
                </div>

                {/* Chevron */}
                <div
                  className={clsx(
                    "text-zinc-300 dark:text-zinc-600 transition-transform duration-200 shrink-0",
                    isExpanded && "rotate-180",
                  )}
                >
                  <ChevronDown size={18} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-4 space-y-0 animate-in slide-in-from-top-2 duration-200 bg-zinc-50/30 dark:bg-black/20">
                  <div className="h-1" />
                  {segments.map((segment, idx) => {
                    // Alternate background based on speaker identity (odd/even speaker number)
                    const speakerNum = parseInt(
                      segment.speaker?.replace(/\D/g, "") || "0",
                      10,
                    );
                    const isOddSpeaker = speakerNum % 2 === 1;

                    return (
                      <div
                        key={segment.id}
                        className={clsx(
                          "flex gap-4 py-1.5",
                          isOddSpeaker
                            ? "bg-zinc-50 dark:bg-zinc-900/50"
                            : "bg-zinc-100/60 dark:bg-zinc-800/40",
                        )}
                      >
                        {/* Time & Speaker */}
                        <div className="shrink-0 w-20 flex flex-col">
                          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                            {segment.time}
                          </span>
                          {segment.speaker && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                              {segment.speaker}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-zinc-900 dark:text-zinc-200 leading-relaxed">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-1" />
                </div>
              )}
            </div>
          );
        })}

        {transcriptions.length === 0 && (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-sm">
            No transcription data
          </div>
        )}
      </div>
    </div>
  );
};
