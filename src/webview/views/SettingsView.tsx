/**
 * SettingsView - Simplified settings panel for Notes app
 *
 * Uses synced session for live transcription toggle
 */

import React from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useSynced } from "../../synced/useSynced";
import type { SessionI } from "../../synced/types";
import { useMentraAuth } from "@mentra/react";

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const SettingsRow = ({
  label,
  value,
  type = "none",
  onClick,
  active,
  disabled,
}: {
  label: string;
  value?: string;
  type?: "toggle" | "none";
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) => (
  <div
    className={clsx(
      "flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 transition-colors",
      disabled && "opacity-50",
    )}
  >
    <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
      {label}
    </span>

    <div className="flex items-center gap-3">
      {value && <span className="text-sm text-zinc-500">{value}</span>}
      {type === "toggle" && (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={clsx(
            "w-11 h-6 rounded-full p-1 relative transition-colors",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
            active
              ? "bg-zinc-900 dark:bg-white"
              : "bg-zinc-200 dark:bg-zinc-700",
          )}
        >
          <div
            className={clsx(
              "w-4 h-4 rounded-full absolute shadow-sm transition-transform top-1",
              active
                ? "bg-white dark:bg-black translate-x-5"
                : "bg-white dark:bg-black translate-x-0",
            )}
          />
        </button>
      )}
    </div>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  // Get live transcription state from session
  const liveTranscriptEnabled = session?.settings?.showLiveTranscript ?? false;

  // Toggle live transcription via RPC
  const handleToggleLiveTranscript = async () => {
    if (!session?.settings?.updateSettings) return;

    try {
      await session.settings.updateSettings({
        showLiveTranscript: !liveTranscriptEnabled,
      });
    } catch (err) {
      console.error("[SettingsView] Failed to toggle live transcript:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 sticky top-0 bg-white dark:bg-black z-10 border-b border-zinc-100 dark:border-zinc-800 transition-colors">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
            Settings
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : (
              <WifiOff size={16} className="text-zinc-400" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {/* Connection Status */}
        {!session && (
          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Connecting to sync...</span>
            </div>
          </div>
        )}

        {/* Glasses Section */}
        <div className="mt-6 mb-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Glasses
          </h3>
          <SettingsRow
            label="Show Transcript on Display"
            type="toggle"
            active={liveTranscriptEnabled}
            onClick={handleToggleLiveTranscript}
            disabled={!session}
          />
        </div>

        {/* Appearance Section */}
        <div className="mt-8 mb-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Appearance
          </h3>
          <SettingsRow
            label="Dark Mode"
            type="toggle"
            active={isDarkMode}
            onClick={onToggleTheme}
          />
        </div>

        {/* Session Info */}
        {session && (
          <div className="mt-8 mb-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Session
            </h3>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  User ID
                </span>
                <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                  {session.userId}
                </span>
              </div>
            </div>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Connection
                </span>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    isConnected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Glasses Connected
                </span>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    session.hasGlassesConnected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500",
                  )}
                >
                  {session.hasGlassesConnected ? "Yes" : "No"}
                </span>
              </div>
            </div>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Recording
                </span>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    session.isRecording
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500",
                  )}
                >
                  {session.isRecording ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Transcript Segments
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {session.transcript?.segments?.length ?? 0}
                </span>
              </div>
            </div>
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Notes
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {session.notes?.notes?.length ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Notes v1.0.0
          </p>
          <p className="text-[10px] text-zinc-300 dark:text-zinc-700 mt-1">
            Powered by @ballah/synced
          </p>
        </div>
      </div>
    </div>
  );
};
