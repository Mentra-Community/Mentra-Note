import { TranscriptionData } from "@mentra/sdk";

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

  addSegment(data: TranscriptionData): void {
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
    }
  }

  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  getFullText(): string {
    return this.segments.map((s) => s.text).join(" ");
  }

  clear(): void {
    this.segments = [];
  }
}
