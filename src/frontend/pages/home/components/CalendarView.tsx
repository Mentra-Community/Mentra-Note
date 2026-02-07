/**
 * CalendarView - Month calendar grid for navigating days
 *
 * Features:
 * - Month navigation (prev/next)
 * - Day grid with activity indicators (dots for days with content)
 * - Click day to navigate to that day's folder
 * - Highlights today
 *
 * Reference: figma-design/src/app/views/FolderList.tsx L250-270, L420-480
 */

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyFolder } from "./FolderList";

interface CalendarViewProps {
  folders: DailyFolder[];
  onSelectDate: (dateString: string) => void;
}

export function CalendarView({ folders, onSelectDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Create a map for quick folder lookup
  const folderByDate = new Map<string, DailyFolder>();
  folders.forEach((folder) => {
    folderByDate.set(folder.dateString, folder);
  });

  // Month stats
  const currentMonthFolders = folders.filter(
    (f) => isSameMonth(f.date, currentMonth),
  );
  const monthNotesCount = currentMonthFolders.reduce(
    (acc, f) => acc + f.noteCount,
    0,
  );
  const daysWithContent = currentMonthFolders.length;

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleDayClick = (day: Date) => {
    const dateString = format(day, "yyyy-MM-dd");
    const folder = folderByDate.get(dateString);
    // Only allow clicking on dates that have content
    if (folder) {
      onSelectDate(dateString);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      {/* Month Header */}
      <div className="sticky top-0 bg-white dark:bg-black z-10 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <ChevronRight size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Month Stats */}
        <div className="flex items-center justify-center gap-4 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{daysWithContent} days with activity</span>
          <span>•</span>
          <span>{monthNotesCount} notes</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 py-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-10 flex items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateString = format(day, "yyyy-MM-dd");
            const folder = folderByDate.get(dateString);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const hasContent = !!folder;
            const noteCount = folder?.noteCount ?? 0;
            const hasTranscript = folder?.hasTranscript ?? false;

            // Disable dates without content (except today which is always clickable)
            const isClickable = hasContent || isDayToday;

            return (
              <button
                key={dateString}
                onClick={() => handleDayClick(day)}
                disabled={!isCurrentMonth || !isClickable}
                className={clsx(
                  "relative h-12 flex flex-col items-center justify-center rounded-xl transition-colors",
                  // Not current month - very faded
                  !isCurrentMonth && "opacity-30 cursor-default",
                  // Current month but no content - greyed out and not clickable
                  isCurrentMonth && !hasContent && !isDayToday && "cursor-default",
                  // Current month with content - clickable with hover
                  isCurrentMonth && hasContent && !isDayToday && "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  // Today - always highlighted
                  isDayToday &&
                    "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100",
                )}
              >
                {/* Day number */}
                <span
                  className={clsx(
                    "text-sm font-medium",
                    // Today
                    isDayToday && "text-white dark:text-zinc-900",
                    // Current month with content
                    !isDayToday && isCurrentMonth && hasContent && "text-zinc-900 dark:text-white",
                    // Current month without content - greyed out
                    !isDayToday && isCurrentMonth && !hasContent && "text-zinc-300 dark:text-zinc-600",
                    // Not current month
                    !isCurrentMonth && "text-zinc-300 dark:text-zinc-700",
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Activity indicators */}
                {hasContent && isCurrentMonth && !isDayToday && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {noteCount > 0 && (
                      <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    )}
                    {hasTranscript && (
                      <span className="w-1 h-1 rounded-full bg-red-400 dark:bg-red-500" />
                    )}
                  </div>
                )}

                {/* Today indicator dots */}
                {isDayToday && hasContent && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {noteCount > 0 && (
                      <span className="w-1 h-1 rounded-full bg-white/60 dark:bg-zinc-900/60" />
                    )}
                    {hasTranscript && (
                      <span className="w-1 h-1 rounded-full bg-red-300 dark:bg-red-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month folder list preview */}
      {currentMonthFolders.length > 0 && (
        <div className="px-4 pb-6">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 px-2">
            Activity this month
          </h3>
          <div className="space-y-1">
            {currentMonthFolders.slice(0, 5).map((folder) => (
              <button
                key={folder.id}
                onClick={() => onSelectDate(folder.dateString)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {format(folder.date, "EEEE, MMM d")}
                </span>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {folder.noteCount > 0 && (
                    <span>
                      {folder.noteCount} note{folder.noteCount !== 1 && "s"}
                    </span>
                  )}
                  {folder.hasTranscript && <span>🎙️</span>}
                </div>
              </button>
            ))}
            {currentMonthFolders.length > 5 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">
                +{currentMonthFolders.length - 5} more days
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
