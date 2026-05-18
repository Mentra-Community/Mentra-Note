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
 *   - First load with no cache: starts at 0:00 and accurately counts from there.
 *     (We do NOT derive from segments — segment timestamps span wall-clock time,
 *      including long silences, so they over-count actual active recording.)
 *
 * Writes to localStorage only on pause/resume transitions, not every tick.
 */

import { useEffect, useRef, useState } from "react";

// Bumping the key on the next breaking storage-format change invalidates older
// caches automatically. v2 → wipes v1 entries that over-counted via segment derivation.
const STORAGE_KEY = "mentra_recording_time_v2";
const LEGACY_STORAGE_KEYS = ["mentra_recording_time"];

interface StoredState {
  date: string;              // YYYY-MM-DD (local)
  accumulatedSeconds: number; // total active recording time *up to* lastResumedAt
  lastResumedAt: number | null; // ms timestamp; null = currently paused
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clearLegacy(): void {
  try {
    for (const k of LEGACY_STORAGE_KEYS) localStorage.removeItem(k);
  } catch {
    /* private mode / quota */
  }
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
    /* private mode / quota: silently fall back to memory. */
  }
}

interface UseRecordingElapsedArgs {
  /** Whether this page is showing today's transcript. Hook is inert otherwise. */
  isToday: boolean;
  /** True when the user has paused transcription. */
  isPaused: boolean;
}

/**
 * Returns the current active-recording duration in seconds for today,
 * updating live while unpaused and frozen while paused.
 */
export function useRecordingElapsed({
  isToday,
  isPaused,
}: UseRecordingElapsedArgs): number {
  const stateRef = useRef<StoredState>({
    date: todayKey(),
    accumulatedSeconds: 0,
    lastResumedAt: null,
  });
  const [elapsed, setElapsed] = useState(0);

  // One-time bootstrap: read from storage or initialize at 0.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isToday || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    // Wipe any legacy v1 cache (which over-counted via segment derivation).
    clearLegacy();

    const stored = readStored();
    if (stored) {
      stateRef.current = stored;
    } else {
      stateRef.current = {
        date: todayKey(),
        accumulatedSeconds: 0,
        lastResumedAt: isPaused ? null : Date.now(),
      };
      writeStored(stateRef.current);
    }
    setElapsed(computeElapsed(stateRef.current));
  }, [isToday, isPaused]);

  // Pause/resume transitions: write to storage.
  const prevPausedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isToday) return;
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

  // Tick every second while unpaused. Frozen when paused.
  useEffect(() => {
    if (!isToday || isPaused) return;
    const id = setInterval(() => {
      setElapsed(computeElapsed(stateRef.current));
    }, 1000);
    // Bump immediately so the display doesn't wait 1s.
    setElapsed(computeElapsed(stateRef.current));
    return () => clearInterval(id);
  }, [isToday, isPaused]);

  return elapsed;
}

function computeElapsed(s: StoredState): number {
  // Date rollover: if we crossed midnight, treat as fresh.
  if (s.date !== todayKey()) return 0;
  if (s.lastResumedAt === null) return s.accumulatedSeconds;
  const running = Math.max(0, Math.floor((Date.now() - s.lastResumedAt) / 1000));
  return s.accumulatedSeconds + running;
}
