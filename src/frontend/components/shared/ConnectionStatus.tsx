/**
 * ConnectionStatus - Shared component for showing sync connection state
 *
 * Shows connection status, glasses status, and provides reconnect action.
 */

import React from "react";
import { Wifi, WifiOff, Glasses, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface ConnectionStatusProps {
  isConnected: boolean;
  hasGlassesConnected?: boolean;
  isRecording?: boolean;
  onReconnect?: () => void;
  variant?: "minimal" | "compact" | "full";
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  hasGlassesConnected = false,
  isRecording = false,
  onReconnect,
  variant = "compact",
  className,
}) => {
  if (variant === "minimal") {
    return (
      <div className={clsx("flex items-center gap-1.5", className)}>
        {isConnected ? (
          <Wifi size={12} className="text-emerald-500" />
        ) : (
          <WifiOff size={12} className="text-zinc-400" />
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        {/* Sync Status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Synced
              </span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-zinc-400" />
              <span className="text-[10px] text-zinc-500 font-medium">
                Offline
              </span>
            </>
          )}
        </div>

        {/* Glasses Status */}
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <div
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                hasGlassesConnected
                  ? isRecording
                    ? "bg-red-500 animate-pulse"
                    : "bg-emerald-500"
                  : "bg-zinc-400"
              )}
            />
            <span className="text-[10px] text-zinc-500">
              {hasGlassesConnected
                ? isRecording
                  ? "Recording"
                  : "Glasses"
                : "No glasses"}
            </span>
          </div>
        )}

        {/* Reconnect Button */}
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="text-[10px] text-blue-500 hover:text-blue-600 font-medium"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={clsx(
        "flex items-center justify-between p-3 rounded-lg border",
        isConnected
          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
          : "bg-zinc-50 dark:bg-[#313338] border-zinc-200 dark:border-[#3f4147]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Connection Icon */}
        <div
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isConnected
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-zinc-100 dark:bg-[#3f4147]"
          )}
        >
          {isConnected ? (
            <Wifi size={16} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WifiOff size={16} className="text-zinc-400" />
          )}
        </div>

        {/* Status Text */}
        <div>
          <p
            className={clsx(
              "text-sm font-medium",
              isConnected
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-zinc-700 dark:text-zinc-300"
            )}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isConnected
              ? hasGlassesConnected
                ? isRecording
                  ? "Recording in progress"
                  : "Glasses connected"
                : "Webview only (no glasses)"
              : "Unable to sync with server"}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Glasses Icon */}
        {isConnected && (
          <div
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center",
              hasGlassesConnected
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-zinc-100 dark:bg-[#3f4147]"
            )}
          >
            <Glasses
              size={16}
              className={
                hasGlassesConnected
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400"
              }
            />
          </div>
        )}

        {/* Reconnect Button */}
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Reconnect
          </button>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
              REC
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading state for when session is not yet available
 */
export const SessionLoading: React.FC<{ message?: string }> = ({
  message = "Connecting...",
}) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
    <Loader2 size={32} className="animate-spin" />
    <p className="text-sm">{message}</p>
  </div>
);

/**
 * Empty state for when there's no data
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
    {icon && (
      <div className="p-4 bg-zinc-100 dark:bg-[#313338] rounded-2xl text-zinc-400">
        {icon}
      </div>
    )}
    <div>
      <p className="font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
      {description && (
        <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1 max-w-sm">
          {description}
        </p>
      )}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {action.label}
      </button>
    )}
  </div>
);
