import { TranscriptionData } from "@mentra/sdk";
import { Transcript as TranscriptModel } from "../schema/transcript.schema";

export interface TranscriptSegment {
  speakerId: string;
  text: string;
  isFinal: boolean;
  startTime: number;
  endTime: number;
  timestamp: Date;
}

export class Transcript {
  private segments: TranscriptSegment[] = [];
  private userEmail: string;
  private directionizationId: string;

  constructor(userEmail: string, directionizationId: string) {
    this.userEmail = userEmail;
    this.directionizationId = directionizationId;
  }

  // Converts incoming transcription data into a segment and adds it to the transcript if finalized
  async addSegment(data: TranscriptionData): Promise<void> {
    const segment: TranscriptSegment = {
      speakerId: data.speakerId ?? "unknown",
      text: data.text,
      isFinal: data.isFinal,
      startTime: data.startTime,
      endTime: data.endTime,
      timestamp: new Date(),
    };

    if (data.isFinal) {
      this.segments.push(segment);

      // Save to MongoDB when finalized
      try {
        await TranscriptModel.create({
          userEmail: this.userEmail,
          directionizationId: segment.speakerId,
          content: segment.text,
        });
      } catch (error) {
        console.error("Failed to save transcript to MongoDB:", error);
      }
    }
  }

  // Returns a copy of all transcript segments
  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  // Combines all segment text into a single string with spaces between segments
  getFullText(): string {
    return this.segments.map((s) => s.text).join(" ");
  }

  // Clears all transcript segments
  clear(): void {
    this.segments = [];
  }
}
