/**
 * SyncedDebug - Test component to verify synced integration
 *
 * This is a debugging tool to test the WebSocket sync between
 * backend and frontend. Remove or hide in production.
 */

import React, { useState } from "react";
import { useSynced } from "../hooks/useSynced";
import type { SessionI } from "../../shared/types";

export function SyncedDebug({ userId }: { userId: string }) {
  const { session, isConnected, reconnect } = useSynced<SessionI>(userId);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-mono shadow-lg hover:bg-purple-700 z-50"
      >
        🔄 Synced Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[500px] bg-zinc-900 text-white rounded-lg shadow-2xl overflow-hidden z-50 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>Synced Debug</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reconnect}
            className="px-2 py-0.5 bg-zinc-700 rounded hover:bg-zinc-600"
          >
            Reconnect
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="px-2 py-0.5 bg-zinc-700 rounded hover:bg-zinc-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto max-h-[400px]">
        {!session ? (
          <div className="text-zinc-400">
            {isConnected
              ? "Connected, waiting for snapshot..."
              : "Connecting..."}
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <Section title="User">
              <Row label="userId" value={session.userId} />
            </Section>

            {/* Transcript */}
            <Section title="Transcript">
              <Row
                label="segments"
                value={`${session.transcript?.segments?.length || 0} items`}
              />
              <Row
                label="currentDate"
                value={session.transcript?.currentDate}
              />
              <Row
                label="daySegmentCount"
                value={session.transcript?.daySegmentCount}
              />
            </Section>

            {/* Meeting */}
            <Section title="Meeting">
              <Row
                label="isInMeeting"
                value={session.meeting?.isInMeeting ? "Yes" : "No"}
              />
              <Row
                label="activeMeeting"
                value={session.meeting?.activeMeeting?.title || "(none)"}
              />
              <Row
                label="recentMeetings"
                value={`${session.meeting?.recentMeetings?.length || 0} items`}
              />
            </Section>

            {/* Notes */}
            <Section title="Notes">
              <Row
                label="notes"
                value={`${session.notes?.notes?.length || 0} items`}
              />
              <Row
                label="generating"
                value={session.notes?.generating ? "Yes" : "No"}
              />
              <TestRPC
                label="Generate Notes"
                onClick={() => session.notes?.generateNotes?.()}
                disabled={session.notes?.generating}
              />
            </Section>

            {/* Display */}
            <Section title="Display">
              <Row
                label="transcriptEnabled"
                value={session.display?.transcriptEnabled ? "Yes" : "No"}
              />
              <TestRPC
                label="Toggle Transcript"
                onClick={() =>
                  session.display?.transcriptEnabled
                    ? session.display?.disableTranscript?.()
                    : session.display?.enableTranscript?.()
                }
              />
              <TestRPC
                label="Show Test Message"
                onClick={() =>
                  session.display?.showMessage?.("Hello from Synced!", 3000)
                }
              />
            </Section>

            {/* Settings */}
            <Section title="Settings">
              <Row
                label="autonomyLevel"
                value={session.settings?.autonomyLevel}
              />
              <Row
                label="showLiveTranscript"
                value={session.settings?.showLiveTranscript ? "Yes" : "No"}
              />
            </Section>

            {/* Agent */}
            <Section title="Agent">
              <Row label="sessionState" value={session.agent?.sessionState} />
            </Section>

            {/* Raw State */}
            <Section title="Raw State (JSON)">
              <pre className="text-[10px] bg-zinc-800 p-2 rounded overflow-x-auto max-h-40">
                {JSON.stringify(session, null, 2)}
              </pre>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-purple-400 font-semibold mb-1">{title}</div>
      <div className="pl-2 border-l border-zinc-700 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}:</span>
      <span className="text-zinc-300">{String(value ?? "(null)")}</span>
    </div>
  );
}

function TestRPC({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
    } catch (e) {
      console.error(`[SyncedDebug] RPC failed:`, e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="mt-1 px-2 py-0.5 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "..." : label}
    </button>
  );
}
