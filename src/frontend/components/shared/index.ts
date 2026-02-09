/**
 * Shared Components Barrel Export
 *
 * Re-exports commonly used shared components for easier importing
 */

export {
  SkeletonLoader,
  HomePageSkeleton,
  FolderListSkeleton,
  DayPageSkeleton,
  NotesTabSkeleton,
  TranscriptTabSkeleton,
  NotePageSkeleton,
  SettingsPageSkeleton,
  ChatSkeleton,
  ContentSkeleton,
  type SkeletonLoaderProps,
} from './SkeletonLoader';

export {
  ErrorState,
  ErrorMessage,
  ConnectionErrorState,
  NoDataState,
  TimeoutErrorState,
  PermissionErrorState,
  ServerErrorState,
  type ErrorStateProps,
} from './ErrorState';
