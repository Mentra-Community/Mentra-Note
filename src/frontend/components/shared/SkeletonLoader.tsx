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
 * HomePage Skeleton - folder list loading state
 */
export function HomePageSkeleton() {
  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Header skeleton */}
      <div className="px-6 pt-4 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Folder list skeleton */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950">
        <FolderListSkeleton count={6} />
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
          <Skeleton className="h-6 w-36" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
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
 * Note Editor Skeleton - for NotePage
 */
export function NotePageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header skeleton */}
      <div className="shrink-0 flex items-center justify-between px-2 py-2 border-b border-zinc-100 dark:border-zinc-900">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-16" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Title */}
        <Skeleton className="h-8 w-2/3" />
        {/* Content */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Settings Page Skeleton
 */
export function SettingsPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header skeleton */}
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-20" />
        <div className="w-10" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
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
