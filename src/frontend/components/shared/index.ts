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
  TranscriptPageSkeleton,
  ConversationDetailPageSkeleton,
  NotesPageSkeleton,
  FolderPageSkeleton,
  CollectionsPageSkeleton,
  SearchPageSkeleton,
  ChatSkeleton,
  ContentSkeleton,
  type SkeletonLoaderProps,
} from './SkeletonLoader';

export { DeleteTranscriptDrawer } from './DeleteTranscriptDrawer';
export { DotBurstSpinner, DotWaveSpinner, DotGridSpinner, DotSpiralSpinner } from './DotBurstSpinner';
export { LoadingState } from './LoadingState';

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
