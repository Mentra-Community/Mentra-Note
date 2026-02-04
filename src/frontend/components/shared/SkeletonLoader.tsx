/**
 * SkeletonLoader Component
 *
 * Displays loading skeleton while data is being fetched from backend.
 * Matches the styling and layout of the component it's replacing.
 */

import { Skeleton } from '../ui/skeleton';

export interface SkeletonLoaderProps {
  count?: number;
  variant?: 'card' | 'list' | 'text' | 'grid';
  height?: string;
  className?: string;
}

/**
 * Skeleton card - for loading note cards or meeting previews
 */
function SkeletonCard() {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
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
    <div className="flex items-center gap-3 p-3 border-b border-neutral-200 dark:border-neutral-800">
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
          className={`h-4 ${i === lines - 1 ? 'w-4/5' : 'w-full'}`}
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
  variant = 'card',
  height,
  className = '',
}: SkeletonLoaderProps) {
  switch (variant) {
    case 'card':
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );

    case 'list':
      return (
        <div className={`border rounded-lg overflow-hidden ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      );

    case 'text':
      return (
        <div className={className}>
          <SkeletonText lines={count} />
        </div>
      );

    case 'grid':
      return (
        <div className={className}>
          <SkeletonGrid count={count} />
        </div>
      );

    default:
      return (
        <div className={`h-${height || '40'} bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse ${className}`} />
      );
  }
}

/**
 * Tab Skeleton - for loading tab content
 */
export function TabSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonLoader variant="text" count={2} />
      <SkeletonLoader variant="card" count={2} />
    </div>
  );
}

/**
 * Notes Skeleton - for loading notes view
 */
export function NotesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Folder header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Meeting cards */}
      <SkeletonLoader variant="card" count={3} />
    </div>
  );
}

/**
 * Actions Skeleton - for loading actions view
 */
export function ActionsSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonLoader variant="list" count={5} />
    </div>
  );
}

/**
 * Settings Skeleton - for loading settings
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-1/4" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
