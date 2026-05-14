/**
 * SkeletonLoader Component
 *
 * Displays loading skeleton while data is being fetched from backend.
 * Matches the styling and layout of the component it's replacing.
 */

import { Skeleton } from "../ui/skeleton";

export interface SkeletonLoaderProps {
  count?: number;
  variant?: "card" | "list" | "text" | "grid";
  height?: string;
  className?: string;
}

/**
 * Skeleton card - for loading note cards or meeting previews
 */
function SkeletonCard() {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton list item - for loading list entries
 */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

/**
 * Skeleton text - for loading paragraphs
 */
function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-4/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton grid - for loading grid of items
 */
function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Main SkeletonLoader component
 */
export function SkeletonLoader({
  count = 3,
  variant = "card",
  height,
  className = "",
}: SkeletonLoaderProps) {
  switch (variant) {
    case "card":
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );

    case "list":
      return (
        <div className={`border rounded-lg overflow-hidden ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      );

    case "text":
      return (
        <div className={className}>
          <SkeletonText lines={count} />
        </div>
      );

    case "grid":
      return (
        <div className={className}>
          <SkeletonGrid count={count} />
        </div>
      );

    default:
      return (
        <div
          className={`h-${height || "40"} bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse ${className}`}
        />
      );
  }
}

// =============================================================================
// Page-Specific Skeletons
// =============================================================================

/**
 * Reusable page header skeleton matching the Mentra Notes kicker + title pattern
 */
function PageHeaderSkeleton({
  showSubtitle = false,
  rightSlots = 0,
}: {
  showSubtitle?: boolean;
  rightSlots?: number;
}) {
  return (
    <div className="shrink-0 px-6 pt-2 pb-4 bg-white dark:bg-zinc-950">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-44" />
          {showSubtitle && <Skeleton className="h-4 w-36" />}
        </div>
        {/* {rightSlots > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: rightSlots }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-lg" />
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
}

/**
 * HomePage Skeleton — kicker + "Transcripts" + status bar + date list
 */
export function HomePageSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-black overflow-hidden">
      <PageHeaderSkeleton showSubtitle rightSlots={2} />

      {/* Transcription status bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Date list */}
      <div className="flex-1 overflow-hidden pb-32">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Folder List Skeleton - matches FolderList component
 */
export function FolderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="h-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 border-b border-zinc-100 dark:border-zinc-800/50"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DayPage Skeleton - tab content loading state
 */
export function DayPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header skeleton */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="h-6 w-36" />
          <div className="flex items-center gap-1 mt4">
            <div className="h-10 w-10 rounded-lg" />
            <div className="h-10 w-10 rounded-lg" />
          </div>
        </div>
        {/* Tabs skeleton */}
        <div className="flex items-center px-4 gap-6 pb-3">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-8" />
        </div>
      </div>

      {/* Tab content skeleton */}
      <div className="flex-1 overflow-hidden p-4">
        <NotesTabSkeleton />
      </div>
    </div>
  );
}

/**
 * Notes Tab Skeleton - for DayPage notes tab
 */
export function NotesTabSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Transcript Tab Skeleton - for DayPage transcript tab
 */
export function TranscriptTabSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          {/* Hour header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          {/* Segments */}
          <div className="space-y-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * NotePage Skeleton — back chevron + "Note", title row with actions, body
 */
export function NotePageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-3">
        <div className="h-9 w-9" />
        <div className="h-4 w-10" />

        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-4">
        {/* Title + action icons */}
        <div className="flex items-start justify-between gap-3 pt-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-3/4" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Timestamp */}
        <Skeleton className="h-3 w-44" />

        {/* Body */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsPage Skeleton — back button + Settings title + profile + action rows
 */
export function SettingsPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
        {/* Profile row */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Export row */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>

        {/* Delete row */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>

        {/* Timezone card */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * TranscriptPage Skeleton — back, title + time range, dropdown + delete, hour groups
 */
export function TranscriptPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      <div className="shrink-0 flex items-center justify-between px-6 py-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        

      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <TranscriptTabSkeleton count={3} />
      </div>

      {/* Bottom recording bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

/**
 * ConversationDetailPage Skeleton — header, summary, transcript preview
 */
export function ConversationDetailPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      <div className="shrink-0 flex items-center justify-between px-3 py-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6 pt-2">
        {/* Summary section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Transcript section */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable NoteRow skeleton — used by NotesPage, FolderPage, etc.
 */
function NoteRowSkeleton() {
  return (
    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-start gap-3">
      <Skeleton className="h-5 w-10 rounded-full mt-1" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-4 mt-2" />
    </div>
  );
}

/**
 * NotesPage Skeleton — kicker + "Notes", day-grouped note rows
 */
export function NotesPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black overflow-hidden">
      <PageHeaderSkeleton rightSlots={2} />

      <div className="flex-1 overflow-hidden pb-32">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="px-6 pt-4 pb-2">
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <NoteRowSkeleton key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * FolderPage Skeleton — back, folder icon + name + count, note list
 */
export function FolderPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3 py-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>

      <div className="px-6 pt-2 pb-3">
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="flex-1 overflow-hidden pb-32">
        {Array.from({ length: 5 }).map((_, i) => (
          <NoteRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * CollectionsPage Skeleton — kicker + "Notes" + "Collections" sub, toggles,
 * filter pills, system rows, folder grid
 */
export function CollectionsPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-6 flex items-center gap-2 pb-4">
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
        {/* System collections */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Folder grid */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <Skeleton className="h-2 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-center">
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SearchPage Skeleton — kicker + "Search", search input, results
 */
export function SearchPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black overflow-hidden">
      <PageHeaderSkeleton />

      {/* Search bar */}
      <div className="px-6 pb-3">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Result count */}
      <div className="px-6 pb-2">
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Notes results */}
        <div className="px-6 pt-3 pb-1">
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/50 space-y-2"
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}

        {/* Transcript results */}
        <div className="px-6 pt-5 pb-1">
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/50 flex items-start gap-3"
          >
            <Skeleton className="h-5 w-5 rounded-full mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Chat Skeleton - for AI chat loading
 */
export function ChatSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] space-y-2 ${i % 2 === 0 ? "items-end" : "items-start"}`}
          >
            <Skeleton
              className={`h-16 ${i % 2 === 0 ? "w-48" : "w-64"} rounded-2xl`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Generic content area skeleton - centered loading state
 */
export function ContentSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
