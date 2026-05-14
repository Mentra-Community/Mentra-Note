/**
 * useRecordingElapsed — persisted "transcribing time today" counter.
 *
 * Tracks active (unpaused) recording duration for the current local day,
 * persisted to localStorage so it survives page reloads, in-app navigation,
 * and full app reopens. Resets automatically when the local date changes.
 *
 * Display rules:
 *   - While recording (not paused): counter ticks every second.
 *   - While paused: counter freezes at the last accumulated total (still visible).
 *   - First load with no cache: derive an initial estimate from today's segments
 *     (last final segment timestamp minus first) so returning users don't see 0:00.
 *
 * Writes to localStorage only on pause/resume transitions, not every tick.
 */

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mentra_recording_time";

interface StoredState {
  date: string;              // YYYY-MM-DD (local)
  accumulatedSeconds: number; // total active recording time *up to* lastResumedAt
  lastResumedAt: number | null; // ms timestamp; null = currently paused
}

interface Segment {
  timestamp: string | number | Date;
  isFinal?: boolean;
  type?: string;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (typeof parsed?.date !== "string") return null;
    if (parsed.date !== todayKey()) return null; // stale (different day)
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota: silently fall back to memory.
  }
}

/**
 * Derive an initial accumulated-seconds estimate from today's transcript
 * segments. Returns 0 if there's nothing to derive from.
 */
function deriveFromSegments(segments: Segment[]): number {
  const finals = segments.filter(
    (s) => s.isFinal !== false && s.type !== "photo" && s.timestamp,
  );
  if (finals.length < 2) return 0;
  const first = new Date(finals[0].timestamp).getTime();
  const last = new Date(finals[finals.length - 1].timestamp).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(0, Math.floor((last - first) / 1000));
}

interface UseRecordingElapsedArgs {
  /** Whether this page is showing today's transcript. Hook is inert otherwise. */
  isToday: boolean;
  /** True when the user has paused transcription. */
  isPaused: boolean;
  /** Today's transcript segments — used to seed initial value on first load. */
  segments: Segment[];
}

/**
 * Returns the current active-recording duration in seconds for today,
 * updating live while unpaused and frozen while paused.
 */
export function useRecordingElapsed({
  isToday,
  isPaused,
  segments,
}: UseRecordingElapsedArgs): number {
  // Seed the in-memory state from localStorage (or derive from segments).
  // The ref mirrors what's persisted so we can update without re-render churn.
  const stateRef = useRef<StoredState>({
    date: todayKey(),
    accumulatedSeconds: 0,
    lastResumedAt: null,
  });
  const [elapsed, setElapsed] = useState(0);

  // One-time bootstrap: read from storage or derive from segments.
  // Re-runs when isToday flips true (so navigating into today initializes).
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isToday || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const stored = readStored();
    if (stored) {
      stateRef.current = stored;
    } else {
      const derived = deriveFromSegments(segments);
      stateRef.current = {
        date: todayKey(),
        accumulatedSeconds: derived,
        lastResumedAt: isPaused ? null : Date.now(),
      };
      writeStored(stateRef.current);
    }
    setElapsed(computeElapsed(stateRef.current));
    // Intentionally don't depend on `segments` — we only seed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday]);

  // Pause/resume transitions: write to storage.
  const prevPausedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isToday) return;
    // Ignore first run until bootstrap has completed.
    if (!bootstrappedRef.current) return;

    const prev = prevPausedRef.current;
    prevPausedRef.current = isPaused;
    if (prev === null) return; // first observation, no transition

    if (prev && !isPaused) {
      // Resumed: start a new active interval.
      stateRef.current = {
        ...stateRef.current,
        lastResumedAt: Date.now(),
      };
      writeStored(stateRef.current);
    } else if (!prev && isPaused) {
      // Paused: fold the running interval into accumulated.
      const now = Date.now();
      const running = stateRef.current.lastResumedAt
        ? Math.max(0, Math.floor((now - stateRef.current.lastResumedAt) / 1000))
        : 0;
      stateRef.current = {
        ...stateRef.current,
        accumulatedSeconds: stateRef.current.accumulatedSeconds + running,
        lastResumedAt: null,
      };
      writeStored(stateRef.current);
      setElapsed(stateRef.current.accumulatedSeconds);
    }
  }, [isPaused, isToday]);

  // Tick every second while unpaused. While paused we freeze.
  useEffect(() => {
    if (!isToday || isPaused) return;
    const id = setInterval(() => {
      setElapsed(computeElapsed(stateRef.current));
    }, 1000);
    // Also bump immediately so the display doesn't wait 1s.
    setElapsed(computeElapsed(stateRef.current));
    return () => clearInterval(id);
  }, [isToday, isPaused]);

  return elapsed;
}

function computeElapsed(s: StoredState): number {
  // Date rollover: if we crossed midnight, reset.
  if (s.date !== todayKey()) {
    return 0;
  }
  if (s.lastResumedAt === null) return s.accumulatedSeconds;
  const running = Math.max(0, Math.floor((Date.now() - s.lastResumedAt) / 1000));
  return s.accumulatedSeconds + running;
}
