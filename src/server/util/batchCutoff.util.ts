/**
 * Batch Cutoff Utilities - Timezone-aware date calculations for transcription batching
 * Uses Intl.DateTimeFormat for timezone conversions (same pattern as TimeZone class)
 * All functions return UTC timestamps suitable for MongoDB storage
 */

/**
 * Calculate today's end-of-day (23:59:59.999) in user's timezone
 * Used when initializing batch cutoff for new users
 *
 * @param timezone - User's IANA timezone (e.g., "America/New_York"), defaults to UTC
 * @returns Date object representing end of today in user's timezone (as UTC timestamp)
 */
export function initializeCutoff(timezone: string | undefined): Date {
  const tz = timezone || "UTC";
  return getEndOfDayInTimezone(tz, new Date());
}

/**
 * Calculate end-of-day (23:59:59.999) for any date in user's timezone
 * Used for recalculating cutoff after timezone changes
 *
 * @param timezone - User's IANA timezone
 * @param referenceDate - Date to calculate end-of-day for (defaults to now)
 * @returns Date object representing end of day in user's timezone (as UTC timestamp)
 */
export function getEndOfDayInTimezone(
  timezone: string | undefined,
  referenceDate: Date = new Date()
): Date {
  const tz = timezone || "UTC";

  // Extract date parts in user's timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1; // Month is 0-indexed
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  // Create a UTC date representing 23:59:59.999 in the user's timezone
  // Date.UTC creates a UTC timestamp, but we want it to represent local 23:59:59.999
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}

/**
 * Check if current time has crossed the batch cutoff in user's timezone
 * Returns true if now > cutoff time
 *
 * @param cutoffDate - The cutoff timestamp to check against
 * @param timezone - User's IANA timezone for comparison
 * @returns true if current time is after the cutoff
 */
export function hasCrossedCutoff(
  cutoffDate: Date | null,
  timezone: string | undefined
): boolean {
  if (!cutoffDate) return false;

  const tz = timezone || "UTC";
  const now = new Date();

  // Get current time formatted in user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "0");

  // Create current time as UTC timestamp for fair comparison
  const nowInTimezone = new Date(Date.UTC(year, month, day, hour, minute, second));

  return nowInTimezone >= cutoffDate;
}

/**
 * Calculate the next day's end-of-day (23:59:59.999) from current cutoff
 * Used when batch cutoff is crossed to set tomorrow's cutoff
 *
 * @param currentCutoff - The current cutoff date
 * @param timezone - User's IANA timezone
 * @returns Date object representing tomorrow's end-of-day in user's timezone
 */
export function getNextDayCutoff(
  currentCutoff: Date,
  timezone: string | undefined
): Date {
  const tz = timezone || "UTC";

  // Add one day to current cutoff
  const tomorrow = new Date(currentCutoff);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Get end-of-day for tomorrow in user's timezone
  return getEndOfDayInTimezone(tz, tomorrow);
}
