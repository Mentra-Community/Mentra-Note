import { AppSession, TranscriptionData,  } from "@mentra/sdk";
import { Transcript } from "./Transcript";
import { sendTranscription } from "../../server/stream/sse";
import { DisplayManager } from "./DisplayManger";
import { TimeZone } from "./TimeZone";
export class User {
  private static readonly sessions: Map<string, User> = new Map();

  readonly userId: string;
  readonly session: AppSession;
  readonly transcript: Transcript;
  readonly display: DisplayManager;
  readonly timezone: TimeZone;

  private transcriptionCleanup: (() => void) | null = null;
  private timezoneCleanup: (() => void) | null = null;

  constructor(session: AppSession) {
    this.userId = session.userId;
    this.session = session;
    this.transcript = new Transcript(session.userId, session.userId);
    this.display = new DisplayManager();
    this.timezone = new TimeZone(session);

    const userTimezone = this.timezone.getTimezone();
    const formattedTime = this.timezone.formatTimeInTimezone();
    console.log(`[User] 🕐 User ${this.userId} timezone: ${userTimezone || "NOT SET"} | Time: ${formattedTime}`);

    this.timezoneCleanup = this.timezone.setupTimezoneListener(session, () => {
      const newTimezone = this.timezone.getTimezone();
      const formattedTime = this.timezone.formatTimeInTimezone();
      console.log(`[User] 🕐 Timezone updated for user ${this.userId}: ${newTimezone || "NOT SET"} | Time: ${formattedTime}`);
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
