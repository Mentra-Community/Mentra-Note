import { AppSession } from "@mentra/sdk";

export class TimeZone {
  private timezone: string | undefined;
  private userId: string;
  private session: AppSession;

  constructor(session: AppSession) {
    this.userId = session.userId;
    this.session = session;
    this.timezone = undefined;
    this.initializeTimezone(session);
  }

  /**
   * Initialize timezone from user settings
   * Primary source: User's explicitly set timezone in settings
   * Falls back to system default if not available
   */
  private initializeTimezone(session: AppSession): void {
    try {
      this.timezone = session.settings.getMentraOS<string>("userTimezone");
      console.log(`[TimeZone] ✅ Retrieved timezone for user ${this.userId}: ${this.timezone || "undefined"}`);
    } catch (error) {
      console.warn(`[TimeZone] ❌ Failed to retrieve timezone for user ${this.userId}:`, error);
      this.timezone = undefined;
    }
  }

  /**
   * Listen for timezone changes from user settings
   * Automatically updates timezone when user changes their setting
   */
  public setupTimezoneListener(session: AppSession, onChangeCallback?: (newTimezone: string) => void): () => void {
    console.log(`[TimeZone] 👂 Setting up timezone listener for user ${this.userId}`);
    return session.settings.onMentraosChange<string>("userTimezone", (newTimezone) => {
      this.timezone = newTimezone;
      console.log(`[TimeZone] 🔄 Timezone change detected for user ${this.userId}: ${newTimezone || "undefined"}`);
      if (onChangeCallback) {
        onChangeCallback(newTimezone);
      }
    });
  }

  /**
   * Get the current user's timezone
   * @returns IANA timezone identifier (e.g., "America/New_York") or undefined if not set
   */
  public getTimezone(): string | undefined {
    return this.timezone;
  }

  /**
   * Set timezone from GPS coordinates
   * Used as fallback when user hasn't explicitly set timezone
   * @param latitude - GPS latitude coordinate
   * @param longitude - GPS longitude coordinate
   */
  public setTimezoneFromLocation(latitude: number, longitude: number): void {
    try {
      // Dynamic import to avoid requiring tz-lookup at top level
      const tzlookup = require("tz-lookup");
      const derivedTimezone = tzlookup(latitude, longitude);

      // Only set if we don't already have a user-configured timezone
      if (!this.timezone) {
        this.timezone = derivedTimezone;
      }
    } catch (error) {
      console.warn(`Failed to derive timezone from location (${latitude}, ${longitude}):`, error);
    }
  }

  /**
   * Get timezone with fallback logic
   * @param fallbackTimezone - Optional fallback timezone if none is set
   * @returns The user's timezone or the fallback, or undefined
   */
  public getTimezoneWithFallback(fallbackTimezone?: string): string | undefined {
    return this.timezone || fallbackTimezone;
  }

  /**
   * Format a date in the user's timezone
   * @param date - The date to format
   * @returns Formatted date string in user's timezone (e.g., "HH:MM M/DD")
   */
  public formatTimeInTimezone(date: Date = new Date()): string {
    try {
      if (!this.timezone) {
        return date.toLocaleString();
      }

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: this.timezone,
        hour: "2-digit",
        minute: "2-digit",
        month: "numeric",
        day: "numeric",
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const hour = parts.find((p) => p.type === "hour")?.value;
      const minute = parts.find((p) => p.type === "minute")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;

      return `◌ ${hour}:${minute} ${month}/${day}`;
    } catch (error) {
      console.warn(`Failed to format time in timezone:`, error);
      return date.toLocaleString();
    }
  }

  /**
   * Get current date in user's timezone
   * @returns Date object adjusted to user's timezone
   */
  public getCurrentDateInTimezone(): Date {
    if (!this.timezone) {
      return new Date();
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
    const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

    return new Date(year, month, day);
  }

  /**
   * Check if a given date is "today" in user's timezone
   * @param date - The date to check
   * @returns true if the date is today in user's timezone
   */
  public isToday(date: Date): boolean {
    const today = this.getCurrentDateInTimezone();
    const checkDate = new Date(date);

    if (!this.timezone) {
      return (
        checkDate.getFullYear() === today.getFullYear() &&
        checkDate.getMonth() === today.getMonth() &&
        checkDate.getDate() === today.getDate()
      );
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayParts = formatter.formatToParts(today);
    const checkParts = formatter.formatToParts(checkDate);

    return (
      todayParts.find((p) => p.type === "year")?.value === checkParts.find((p) => p.type === "year")?.value &&
      todayParts.find((p) => p.type === "month")?.value === checkParts.find((p) => p.type === "month")?.value &&
      todayParts.find((p) => p.type === "day")?.value === checkParts.find((p) => p.type === "day")?.value
    );
  }


  /**
   * Check if local time has passed the end of day batch transcriptions cutoff
   * @returns true if current local time is after the batch cutoff time, false otherwise
   */
  async isAfterEndOfDay(): Promise<boolean> {
    const { getUserState } = await import("../../server/api/db/userState.api");
    const userState = await getUserState(this.userId);
    if (!userState) return false;

    const localTimeFormatted = this.getLocalTime();
    const cutoffTimeFormatted = String(userState.endOfDateBatchTranscriptions);
    const isAfter = localTimeFormatted > cutoffTimeFormatted;

    console.log(`[TimeZone] Local time ${localTimeFormatted} is after endOfDateBatchTranscriptions ${cutoffTimeFormatted}: ${isAfter}`);
    return isAfter;
  }

  /**
   * Get current local time formatted in user's timezone
   * @returns Formatted local time string (e.g., "02/04/2026, 05:07:14 PM")
   */
  public getLocalTime(): string {
    return this.formatDateInTimezone(new Date());
  }

  /**
   * Format any date in user's timezone
   * @param date - Date to format
   * @returns Formatted date string (e.g., "02/04/2026, 05:07:14 PM")
   */
  public formatDateInTimezone(date: Date): string {
    if (!this.timezone) {
      return date.toString();
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return formatter.format(date);
  }

  /**
   * Clean up timezone listener
   * Call the returned function from setupTimezoneListener to stop listening
   */
  public dispose(): void {
    this.timezone = undefined;
  }



  
}
