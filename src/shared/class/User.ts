import { AppSession, TranscriptionData,  } from "@mentra/sdk";
import { Transcript } from "./Transcript";
import { sendTranscription } from "../../server/stream/sse";
import { DisplayManager } from "./DisplayManger";
import { TimeZone } from "./TimeZone";
import {
  initializeCutoff,
  hasCrossedCutoff,
  getNextDayCutoff,
} from "../../server/util/batchCutoff.util";
import {
  getUserState,
  updateBatchCutoff,
} from "../../server/api/db/userState.api";
import { batchTranscriptionsToR2, deleteProcessedTranscriptions, extractDateFromFormatted } from "../../server/manager/r2-batch.manager";
export class User {
  private static readonly sessions: Map<string, User> = new Map();

  readonly userId: string;
  readonly session: AppSession;
  readonly transcript: Transcript;
  readonly display: DisplayManager;
  readonly timezone: TimeZone;

  private transcriptionCleanup: (() => void) | null = null;
  private timezoneCleanup: (() => void) | null = null;

  private batchCutoff: Date | null = null;
  private isInitializingBatchState: boolean = false;

  constructor(session: AppSession) {
    this.userId = session.userId;
    this.session = session;
    this.transcript = new Transcript(session.userId, session.userId);
    this.transcript.setUser(this);
    this.display = new DisplayManager();
    this.timezone = new TimeZone(session);

    const userTimezone = this.timezone.getTimezone();
    const formattedTime = this.timezone.formatTimeInTimezone();
    console.log(`[User] 🕐 User ${this.userId} timezone: ${userTimezone || "NOT SET"} | Time: ${formattedTime}`);

    this.timezoneCleanup = this.timezone.setupTimezoneListener(session, () => {
      const newTimezone = this.timezone.getTimezone();
      const formattedTime = this.timezone.formatTimeInTimezone();
      console.log(`[User] 🕐 Timezone updated for user ${this.userId}: ${newTimezone || "NOT SET"} | Time: ${formattedTime}`);

      // Handle batch cutoff recalculation
      this.handleTimezoneChange().catch(error => {
        console.error(`[User] Failed to handle timezone change for ${this.userId}:`, error);
      });
    });

    User.sessions.set(this.userId, this);
  }

  /**
   * Start listening for transcriptions
   */
  startTranscription(): void {
    if (this.transcriptionCleanup) {
      return; // Already listening
    }

    this.transcriptionCleanup = this.session.events.onTranscription(
      async (data: TranscriptionData) => {
        const speaker = data.speakerId ?? "unknown";
        const formattedTime = this.timezone.formatTimeInTimezone();
        console.log(`[${formattedTime}] ${this.userId}, [${speaker}]: ${data.text} (final: ${data.isFinal})`);

        await this.transcript.addSegment(data);
        sendTranscription(this.userId, data);

        if (data.isFinal) {
          const isBatchTime = await this.timezone.isAfterEndOfDay();

          console.log(`[User] ${this.userId} timezone: ${this.timezone.getLocalTime()}`);
          if (isBatchTime) {
            const userState = await getUserState(this.userId);
            if (userState) {
              console.log(`[User] 📦 Batch cutoff crossed for ${this.userId} after transcription`);
              const cutoffDateTime = userState.endOfDateBatchTranscriptions;
              const batchResult = await batchTranscriptionsToR2({
                userEmail: this.userId,
                cutoffDateTime,
              });

              if (batchResult.success) {
                const cutoffDate = extractDateFromFormatted(cutoffDateTime);
                await deleteProcessedTranscriptions({
                  userEmail: this.userId,
                  cutoffDate,
                });

                // Update cutoff to today's end-of-day (so next batch is tomorrow)
                const timezone = this.timezone.getTimezone();
                if (timezone) {
                  const todayEndOfDay = initializeCutoff(timezone);
                  const formattedCutoff = this.timezone.formatDateInTimezone(todayEndOfDay);
                  await updateBatchCutoff(this.userId, formattedCutoff);
                  this.batchCutoff = todayEndOfDay;
                  console.log(`[User] Updated batch cutoff to today's end-of-day: ${formattedCutoff}`);
                }
              }
            }
          }
        }
        
      }
    );
  }

  /**
   * Stop listening for transcriptions
   */
  stopTranscription(): void {
    if (this.transcriptionCleanup) {
      this.transcriptionCleanup();
      this.transcriptionCleanup = null;
    }
  }

  /**
   * Check if batch cutoff has been crossed and handle it
   * Called by Transcript before each save
   */
  async checkAndHandleBatchCutoff(): Promise<void> {
    if (this.isInitializingBatchState || !this.batchCutoff) {
      return;
    }

    const timezone = this.timezone.getTimezone();
    if (!timezone) return;

    if (hasCrossedCutoff(this.batchCutoff, timezone)) {
      await this.handleBatchCutoffCrossed();
    }
  }

  /**
   * Handle batch cutoff being crossed
   * Logs completed batch and updates cutoff
   */
  private async handleBatchCutoffCrossed(): Promise<void> {
    try {
      const timezone = this.timezone.getTimezone();
      if (!timezone) return;

      const formattedTime = this.timezone.formatTimeInTimezone();
      console.log(
        `[User] 📦 BATCHING TO R2 for ${this.userId} at ${formattedTime}`,
        `Previous cutoff: ${this.batchCutoff?.toISOString()}`
      );

      // Use current cutoff if available, otherwise use today's date
      const currentCutoff = this.batchCutoff || new Date();
      const nextCutoff = getNextDayCutoff(currentCutoff, timezone);
      const formattedNextCutoff = this.timezone.formatDateInTimezone(nextCutoff);
      await updateBatchCutoff(this.userId, formattedNextCutoff);
      this.batchCutoff = nextCutoff;

      console.log(`[User] Updated batch cutoff to: ${formattedNextCutoff}`);
    } catch (error) {
      console.error(`[User] Error handling batch cutoff for ${this.userId}:`, error);
    }
  }

  /**
   * Handle timezone change event
   * Recalculates batch cutoff for new timezone
   */
  private async handleTimezoneChange(): Promise<void> {
    try {
      const timezone = this.timezone.getTimezone();
      if (!timezone || !this.batchCutoff) return;

      const newCutoff = initializeCutoff(timezone);
      const formattedNewCutoff = this.timezone.formatDateInTimezone(newCutoff);
      await updateBatchCutoff(this.userId, formattedNewCutoff);
      this.batchCutoff = newCutoff;

      console.log(
        `[User] Recalculated batch cutoff after timezone change:`,
        `New cutoff: ${formattedNewCutoff}`
      );
    } catch (error) {
      console.error(`[User] Error handling timezone change for ${this.userId}:`, error);
    }
  }

  /**
   * Clean up and remove user session
   */
  dispose(): void {
    this.stopTranscription();
    if (this.timezoneCleanup) {
      this.timezoneCleanup();
    }
    this.timezone.dispose();
    User.sessions.delete(this.userId);
  }

  static get(userId: string): User | undefined {
    return User.sessions.get(userId);
  }

  static getAll(): User[] {
    return Array.from(User.sessions.values());
  }
}
