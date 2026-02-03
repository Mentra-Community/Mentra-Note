import { AppSession, TranscriptionData,  } from "@mentra/sdk";
import { Transcript } from "./Transcript";
import { sendTranscription } from "../../server/stream/sse";
import { DisplayManager } from "./DisplayManger";
export class User {
  private static readonly sessions: Map<string, User> = new Map();

  readonly userId: string;
  readonly session: AppSession;
  readonly transcript: Transcript;
  readonly display: DisplayManager;
  
  private transcriptionCleanup: (() => void) | null = null;

  constructor(session: AppSession) {
    this.userId = session.userId;
    this.session = session;
    this.transcript = new Transcript(session.userId, session.userId);
    this.display = new DisplayManager();

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
        console.log(` ${this.userId}, [${speaker}]: ${data.text} (final: ${data.isFinal})`);

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
    User.sessions.delete(this.userId);
  }

  static get(userId: string): User | undefined {
    return User.sessions.get(userId);
  }

  static getAll(): User[] {
    return Array.from(User.sessions.values());
  }
}
