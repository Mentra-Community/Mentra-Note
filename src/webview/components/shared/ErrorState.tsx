/**
 * ErrorState Component
 *
 * Displays error messages with retry capability.
 * Used when API calls fail or data cannot be loaded.
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error | string;
  onRetry?: () => void;
  onClose?: () => void;
  showDetails?: boolean;
}

/**
 * Main ErrorState component
 */
export function ErrorState({
  title = "Failed to Load",
  message,
  error,
  onRetry,
  onClose,
  showDetails = false,
}: ErrorStateProps) {
  const errorDetails = typeof error === "string" ? error : error?.message;

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            {title}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        </div>
      </div>

      {showDetails && errorDetails && (
        <div className="w-full rounded bg-red-100 p-3 font-mono text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
          {errorDetails}
        </div>
      )}

      <div className="flex gap-2">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error message
 */
export function ErrorMessage({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300 ${className}`}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}

/**
 * Connection error - specific message for backend unavailable
 */
export function ConnectionErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Failed"
      message="Unable to connect to the backend. Please check your connection and try again."
      showDetails={false}
      onRetry={onRetry}
    />
  );
}

/**
 * No data state
 */
export function NoDataState({
  title = "No Data",
  message = "No data available yet.",
  icon: Icon = AlertCircle,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-12 dark:border-neutral-800 dark:bg-neutral-950">
      <Icon className="h-8 w-8 text-neutral-400 dark:text-neutral-600" />
      <div className="text-center">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Timeout error
 */
export function TimeoutErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Request Timed Out"
      message="The request took too long. Please try again."
      onRetry={onRetry}
    />
  );
}

/**
 * Permission error
 */
export function PermissionErrorState() {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to view this content."
    />
  );
}

/**
 * Server error
 */
export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Server Error"
      message="Something went wrong on the server. Please try again later."
      onRetry={onRetry}
    />
  );
}
