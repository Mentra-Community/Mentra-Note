/**
 * Session Index
 *
 * Re-exports the NotesSession and session manager.
 */

export { NotesSession, sessions } from "./NotesSession";
export {
  TranscriptManager,
  NotesManager,
  ChatManager,
  SettingsManager,
  type TranscriptSegment,
  type HourSummary,
  type NoteData,
  type ChatMessage,
  type GlassesDisplayMode,
} from "./managers";
