/**
 * useSSE Hook - SSE Connection with Typed Events
 *
 * Connects to the backend SSE stream for real-time updates.
 * Includes TypeScript types for all events from backend design.
 *
 * Events from /docs/backend-design-doc.md (SSE Events section):
 * - transcript: Live transcription from glasses
 * - state_update: Session state changes
 * - meeting_started: Meeting detected
 * - meeting_ended: Meeting concluded
 * - meeting_processing: Note generation in progress
 * - notes_ready: Notes generated
 * - research_started: Research initiated
 * - research_progress: Research updates
 * - research_complete: Research finished
 * - command_received: Voice command detected
 * - command_executed: Command processed
 * - sensitive_detected: Sensitive topic found
 */

import { useState, useEffect, useRef, useCallback } from "react";

// =============================================================================
// Base Event Type
// =============================================================================

export interface SSEEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

// =============================================================================
// Typed Event Interfaces - Matching backend design
// =============================================================================

export interface TranscriptEvent extends SSEEvent {
  type: 'transcript';
  text: string;
  speakerHint?: string;
  speakerLabel?: string;
  isFinal: boolean;
}

export interface StateUpdateEvent extends SSEEvent {
  type: 'state_update';
  status: 'idle' | 'meeting_active' | 'meeting_ended' | 'processing';
  activeMeetingId?: string;
  lastAnalysisAt?: string;
  detectedSensitiveTopics?: string[];
  effectiveAutonomyLevel?: 'capture_only' | 'suggest' | 'act_with_constraints';
}

export interface MeetingStartedEvent extends SSEEvent {
  type: 'meeting_started';
  meetingId: string;
  classification?: {
    presetMatch: string;
    category: string;
    confidence: number;
  };
  startTime: string;
}

export interface MeetingEndedEvent extends SSEEvent {
  type: 'meeting_ended';
  meetingId: string;
  endTime: string;
}

export interface MeetingProcessingEvent extends SSEEvent {
  type: 'meeting_processing';
  meetingId: string;
  stage: string;
}

export interface NotesReadyEvent extends SSEEvent {
  type: 'notes_ready';
  meetingId: string;
  noteId: string;
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    id: string;
    task: string;
    priority: 'low' | 'medium' | 'high';
    owner: string;
    dueDate?: string;
  }>;
}

export interface ResearchStartedEvent extends SSEEvent {
  type: 'research_started';
  researchId: string;
  query: string;
  queryType: string;
}

export interface ResearchProgressEvent extends SSEEvent {
  type: 'research_progress';
  researchId: string;
  stage: string;
  message: string;
  partialResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface ResearchCompleteEvent extends SSEEvent {
  type: 'research_complete';
  researchId: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    content?: string;
  }>;
  summary?: string;
}

export interface CommandReceivedEvent extends SSEEvent {
  type: 'command_received';
  command: {
    type: 'research' | 'summarize' | 'end_meeting' | 'enable_transcript' | 'disable_transcript';
    target?: string;
    isComplete: boolean;
  };
}

export interface CommandExecutedEvent extends SSEEvent {
  type: 'command_executed';
  command: string;
  result: any;
}

export interface SensitiveDetectedEvent extends SSEEvent {
  type: 'sensitive_detected';
  topics: string[];
  action: string;
}

// Union type for all possible events
export type AnySSEEvent =
  | TranscriptEvent
  | StateUpdateEvent
  | MeetingStartedEvent
  | MeetingEndedEvent
  | MeetingProcessingEvent
  | NotesReadyEvent
  | ResearchStartedEvent
  | ResearchProgressEvent
  | ResearchCompleteEvent
  | CommandReceivedEvent
  | CommandExecutedEvent
  | SensitiveDetectedEvent
  | SSEEvent;

export interface UseSSEReturn {
  isConnected: boolean;
  events: AnySSEEvent[];
  lastEvent: AnySSEEvent | null;
  error: string | null;
  reconnect: () => void;
  clearEvents: () => void;
  getEventsByType: <T extends SSEEvent['type']>(type: T) => AnySSEEvent[];
}

const MAX_EVENTS = 100;
const RECONNECT_DELAY = 3000;

export function useSSE(userId: string | null): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<AnySSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!userId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const url = `/api/events?userId=${encodeURIComponent(userId)}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        if (!isMountedRef.current) return;
        console.log("[SSE] Connected");
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as AnySSEEvent;
          console.log(`[SSE] Received event: ${data.type}`);
          setEvents((prev) => {
            const updated = [...prev, data];
            return updated.slice(-MAX_EVENTS);
          });
        } catch (err) {
          console.error("[SSE] Failed to parse event:", err);
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        console.warn("[SSE] Connection error, reconnecting...");
        setIsConnected(false);
        eventSource.close();

        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, RECONNECT_DELAY);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("[SSE] Failed to connect:", err);
      setError("Failed to connect to event stream");
      setIsConnected(false);
    }
  }, [userId]);

  const reconnect = useCallback(() => {
    console.log("[SSE] Manual reconnect");
    connect();
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getEventsByType = useCallback(
    (type: string) => {
      return events.filter((event) => event.type === type);
    },
    [events]
  );

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isMountedRef.current = true;

    if (userId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, connect]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    isConnected,
    events,
    lastEvent,
    error,
    reconnect,
    clearEvents,
    getEventsByType,
  };
}
