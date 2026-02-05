/**
 * Shared Components Barrel Export
 *
 * Re-exports commonly used shared components for easier importing
 */

export {
  SkeletonLoader,
  TabSkeleton,
  NotesSkeleton,
  ActionsSkeleton,
  SettingsSkeleton,
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
