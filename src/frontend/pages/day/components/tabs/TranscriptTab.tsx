/**
 * TranscriptTab - Displays transcription segments grouped by hour
 *
 * Features:
 * - Collapsible hour sections with smart banners
 * - Sticky hour headers when expanded (stays at top while scrolling)
 * - Smart banner logic: Interim text > Hour Summary > First segment preview
 * - Real-time interim text display for current hour
 * - Auto-scroll for new segments (only when user is near bottom)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type {
  TranscriptSegment,
  HourSummary,
} from "../../../../../shared/types";

interface TranscriptTabProps {
  segments: TranscriptSegment[];
  hourSummaries?: HourSummary[];
  interimText?: string;
  currentHour?: number; // Only provided for "today" - undefined for historical days
  dateString: string;
  onGenerateSummary?: (hour: number) => Promise<HourSummary>;
}

interface GroupedSegments {
  [hourKey: string]: TranscriptSegment[];
}

// Threshold in pixels - if user is within this distance from bottom, auto-scroll
const AUTO_SCROLL_THRESHOLD = 150;

export function TranscriptTab({
  segments,
  hourSummaries = [],
  interimText = "",
  currentHour,
  dateString,
  onGenerateSummary,
}: TranscriptTabProps) {
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());
  const [stuckHeader, setStuckHeader] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [generatingHour, setGeneratingHour] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prevSegmentCountRef = useRef(segments.length);

  // Parse hour key and return components
  const parseHourKey = (hourKey: string): { hour24: number; label: string } => {
    const [hour24Str, label] = hourKey.split("|");
    return {
      hour24: parseInt(hour24Str.split(":")[0], 10),
      label: label || hourKey,
    };
  };

  // Create hour key from hour number
  const createHourKey = (hour: number): string => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:00|${hour12} ${ampm}`;
  };

  // Parse timestamp and return hour key for grouping
  const getHourKey = (timestamp: Date | string): string => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const hour = date.getHours();
    return createHourKey(hour);
  };

  // Format timestamp for display (12-hour with AM/PM)
  const formatTime = (timestamp: Date | string): string => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Group segments by hour
  const groupedSegments: GroupedSegments = segments.reduce((acc, segment) => {
    if (!segment.timestamp) return acc;
    const hourKey = getHourKey(segment.timestamp);
    if (!acc[hourKey]) {
      acc[hourKey] = [];
    }
    acc[hourKey].push(segment);
    return acc;
  }, {} as GroupedSegments);

  // Sort hours chronologically
  const sortedHours = Object.keys(groupedSegments).sort((a, b) => {
    const { hour24: hourA } = parseHourKey(a);
    const { hour24: hourB } = parseHourKey(b);
    return hourA - hourB;
  });

  // Get summary for a specific hour
  const getHourSummary = (hour: number): HourSummary | undefined => {
    return hourSummaries.find((s) => s.date === dateString && s.hour === hour);
  };

  /**
   * Parse summary into title and body (split by newline)
   */
  const parseSummary = (
    summary: string,
  ): { title: string; body: string } | null => {
    if (!summary) return null;

    const lines = summary.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;

    if (lines.length === 1) {
      // Single line - treat as title only
      return { title: lines[0].trim(), body: "" };
    }

    // First line is title, rest is body
    return {
      title: lines[0].trim(),
      body: lines.slice(1).join(" ").trim(),
    };
  };

  /**
   * Get banner content for an hour
   * Returns parsed title/body if summary available, otherwise first segment preview
   */
  const getBannerContent = (
    hourKey: string,
    hourSegments: TranscriptSegment[],
  ): {
    title: string | null;
    body: string | null;
    preview: string;
    hasSummary: boolean;
  } => {
    const { hour24 } = parseHourKey(hourKey);

    // Check for AI-generated hour summary
    const summaryObj = getHourSummary(hour24);
    const hasSummary = !!(
      summaryObj &&
      summaryObj.summary &&
      summaryObj.segmentCount > 0
    );

    // Parse summary into title/body
    const parsed = hasSummary ? parseSummary(summaryObj!.summary) : null;

    // Get first segment as preview/fallback
    const firstSegmentText = hourSegments[0]?.text || "";
    const preview =
      firstSegmentText.length > 80
        ? firstSegmentText.substring(0, 80) + "..."
        : firstSegmentText || "No content";

    return {
      title: parsed?.title || null,
      body: parsed?.body || null,
      preview,
      hasSummary,
    };
  };

  /**
   * Check if this is the current hour and has interim text
   */
  const hasInterimForHour = (hourKey: string): boolean => {
    const { hour24 } = parseHourKey(hourKey);
    const isCurrentHour = currentHour !== undefined && hour24 === currentHour;
    return isCurrentHour && interimText.trim().length > 0;
  };

  // Check if user is near bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
  }, []);

  // Handle scroll to track if user scrolled up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    let currentStuck: string | null = null;

    // Find which expanded header should be stuck
    for (const hourKey of sortedHours) {
      if (!expandedHours.has(hourKey)) continue;

      const header = headerRefs.current.get(hourKey);
      if (!header) continue;

      const headerRect = header.getBoundingClientRect();
      // If the header's top is at or above the container top, it should be stuck
      if (headerRect.top <= containerRect.top + 1) {
        currentStuck = hourKey;
      }
    }

    setStuckHeader(currentStuck);

    // Update auto-scroll state based on scroll position
    setShouldAutoScroll(isNearBottom());
  }, [expandedHours, sortedHours, isNearBottom]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll when new segments arrive (only if user is near bottom)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if new segments were added
    if (segments.length > prevSegmentCountRef.current) {
      // Only auto-scroll if user was near the bottom
      if (shouldAutoScroll) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }

    prevSegmentCountRef.current = segments.length;
  }, [segments.length, shouldAutoScroll]);

  const toggleHour = (hourKey: string) => {
    setExpandedHours((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hourKey)) {
        newSet.delete(hourKey);
        // Clear stuck header if we're collapsing it
        if (stuckHeader === hourKey) {
          setStuckHeader(null);
        }
      } else {
        newSet.add(hourKey);
      }
      return newSet;
    });
  };

  // Handle generating summary for an hour
  const handleGenerateSummary = async (e: React.MouseEvent, hour: number) => {
    e.stopPropagation(); // Don't toggle expand

    if (!onGenerateSummary || generatingHour !== null) return;

    setGeneratingHour(hour);
    try {
      await onGenerateSummary(hour);
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setGeneratingHour(null);
    }
  };

  if (segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12 text-zinc-400">
          <p className="text-sm">No transcript for this day</p>
          <p className="text-xs mt-1">
            Transcriptions will appear here when you record
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto relative">
      <div className="py-2">
        {sortedHours.map((hourKey) => {
          const hourSegments = groupedSegments[hourKey];
          const { hour24, label: hourLabel } = parseHourKey(hourKey);
          const isExpanded = expandedHours.has(hourKey);
          const isStuck = stuckHeader === hourKey;
          const isCurrentHour =
            currentHour !== undefined && hour24 === currentHour;

          const banner = getBannerContent(hourKey, hourSegments);
          const summary = getHourSummary(hour24);
          const hasSummary = summary && summary.segmentCount > 0;
          const isGenerating = generatingHour === hour24;

          return (
            <div
              key={hourKey}
              className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              {/* Hour Header - Sticky when expanded */}
              <button
                ref={(el) => {
                  if (el) headerRefs.current.set(hourKey, el);
                }}
                onClick={() => toggleHour(hourKey)}
                className={clsx(
                  "w-full flex items-start gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-left",
                  isExpanded && "bg-white dark:bg-zinc-950 sticky top-0 z-10",
                  isExpanded &&
                    isStuck &&
                    "shadow-sm border-b border-zinc-200 dark:border-zinc-700",
                )}
              >
                {/* Hour Label */}
                <div className="flex items-center gap-2 shrink-0 w-20">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {hourLabel}
                  </span>
                  {isCurrentHour && (
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>

                {/* Banner Content (when collapsed) */}
                {!isExpanded && (
                  <div className="flex-1 min-w-0">
                    {/* Title + Body (when summary exists) */}
                    {banner.hasSummary && banner.title ? (
                      <>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {banner.title}
                        </p>
                        {banner.body && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                            {banner.body}
                          </p>
                        )}
                      </>
                    ) : (
                      /* Preview (when no summary) */
                      <p className="text-sm text-zinc-400 dark:text-zinc-500 italic line-clamp-1">
                        {banner.preview}
                      </p>
                    )}

                    {/* Interim text shown BELOW summary for current hour */}
                    {hasInterimForHour(hourKey) && (
                      <p className="text-sm text-green-600 dark:text-green-400 italic mt-1 line-clamp-1">
                        {interimText}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {hourSegments.length} segment
                        {hourSegments.length !== 1 ? "s" : ""}
                      </span>
                      {!banner.hasSummary && onGenerateSummary && (
                        <button
                          onClick={(e) => handleGenerateSummary(e, hour24)}
                          disabled={isGenerating}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium flex items-center gap-1 transition-colors"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={10} className="animate-spin" />
                              <span>Summarizing...</span>
                            </>
                          ) : (
                            <span>Generate summary</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary shown when expanded */}
                {isExpanded && hasSummary && (
                  <div className="flex-1 min-w-0">
                    {banner.title && (
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {banner.title}
                      </p>
                    )}
                    {banner.body && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {banner.body}
                      </p>
                    )}
                  </div>
                )}

                {/* Expand indicator */}
                <div className="text-zinc-400 dark:text-zinc-500 shrink-0 ml-auto pt-0.5">
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </button>

              {/* Expanded Segments */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
                  {hourSegments.map((segment, idx) => (
                    <div key={segment.id || idx} className="flex gap-3">
                      {/* Timestamp */}
                      <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 w-16 shrink-0 pt-0.5">
                        {segment.timestamp ? formatTime(segment.timestamp) : ""}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {segment.text}
                        </p>
                        {segment.speakerId && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
                            Speaker {segment.speakerId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Show interim text at the bottom for current hour */}
                  {isCurrentHour && interimText.trim() && (
                    <div className="flex gap-3 opacity-70">
                      <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 w-16 shrink-0 pt-0.5">
                        now
                      </span>
                      <p className="flex-1 text-sm text-green-600 dark:text-green-400 italic leading-relaxed">
                        {interimText}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
