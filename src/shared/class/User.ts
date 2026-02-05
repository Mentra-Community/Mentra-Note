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
  initializeUserState,
  updateBatchCutoff,
} from "../../server/api/db/userState.api";
import { batchTranscriptionsToR2 } from "../../server/manager/r2-batch.manager";
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

    // Initialize batch state asynchronously
    // this.initializeBatchState().catch(error => {
    //   console.error(`[User] Failed to initialize batch state for ${this.userId}:`, error);
    // });

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
              await batchTranscriptionsToR2({
                userEmail: this.userId,
                cutoffDateTime,
              });
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
   * Initialize batch cutoff from database or create new
   * Called asynchronously from constructor
   */
  private async initializeBatchState(): Promise<void> {
    if (this.isInitializingBatchState) return;
    this.isInitializingBatchState = true;

    try {
      const timezone = this.timezone.getTimezone();
      if (!timezone) {
        console.warn(`[User] Batch state initialization skipped for ${this.userId}: timezone not set`);
        this.isInitializingBatchState = false;
        return;
      }

      const userState = await getUserState(this.userId);

      if (userState) {
        this.batchCutoff = new Date(userState.endOfDateBatchTranscriptions);
        console.log(`[User] Loaded batch cutoff for ${this.userId}: ${this.batchCutoff.toISOString()}`);

        // Check if cutoff crossed while offline
        if (hasCrossedCutoff(this.batchCutoff, timezone)) {
          console.log(`[User] Batch cutoff crossed while ${this.userId} was offline`);
          await this.handleBatchCutoffCrossed();
        }
      } else {
        const initialCutoff = initializeCutoff(timezone);
        const formattedCutoff = this.timezone.formatDateInTimezone(initialCutoff);
        await initializeUserState(this.userId, formattedCutoff);
        this.batchCutoff = initialCutoff;
        console.log(`[User] Initialized batch cutoff for ${this.userId}: ${formattedCutoff}`);
      }
    } catch (error) {
      console.error(`[User] Error initializing batch state for ${this.userId}:`, error);
    } finally {
      this.isInitializingBatchState = false;
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

      const nextCutoff = getNextDayCutoff(this.batchCutoff!, timezone);
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
