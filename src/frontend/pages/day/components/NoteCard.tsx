/**
 * NoteCard - Displays a note preview in the notes grid
 *
 * Shows:
 * - Note title
 * - Clean plain-text preview (HTML stripped)
 * - AI Generated or Manual badge
 * - Creation time
 */

import { clsx } from "clsx";
import type { Note } from "../../../../shared/types";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

/**
 * Strip HTML tags and decode entities to get plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Check if content is placeholder or empty
 */
function isPlaceholderContent(content: string | undefined): boolean {
  if (!content) return true;
  const stripped = stripHtml(content).toLowerCase();
  return (
    stripped === "" ||
    stripped === "tap to edit this note..." ||
    stripped === "tap to start writing..." ||
    stripped === "start writing..." ||
    stripped === "no content"
  );
}

/**
 * Get clean preview text from note content
 */
function getPreviewText(note: Note): string {
  // Try content first (user-edited), then summary (AI-generated)
  // Check both explicitly since empty string "" is falsy
  let rawContent = "";

  if (note.content && !isPlaceholderContent(note.content)) {
    rawContent = note.content;
  } else if (note.summary && !isPlaceholderContent(note.summary)) {
    rawContent = note.summary;
  }

  if (!rawContent) {
    return "";
  }

  const plainText = stripHtml(rawContent);

  if (!plainText || isPlaceholderContent(plainText)) {
    return "";
  }

  // Truncate to ~100 chars
  if (plainText.length > 100) {
    return plainText.substring(0, 100).trim() + "...";
  }

  return plainText;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  // Debug: log note data
  console.log("[NoteCard]", note.title, {
    content: note.content?.substring(0, 50),
    summary: note.summary?.substring(0, 50),
  });

  const isAIGenerated = !!note.summary && !isPlaceholderContent(note.summary);
  const previewText = getPreviewText(note);
  const hasContent = previewText.length > 0;

  console.log(
    "[NoteCard] previewText:",
    previewText,
    "hasContent:",
    hasContent,
  );

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all min-h-[160px] flex flex-col"
    >
      {/* Title */}
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 line-clamp-2">
        {note.title || "Untitled Note"}
      </h3>

      {/* Preview */}
      <p
        className={clsx(
          "text-sm flex-1 line-clamp-3",
          hasContent
            ? "text-zinc-500 dark:text-zinc-400"
            : "text-zinc-400 dark:text-zinc-500 italic",
        )}
      >
        {hasContent ? previewText : "No content"}
      </p>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        {/* Badge */}
        <span
          className={clsx(
            "inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded uppercase tracking-wide",
            isAIGenerated
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
          )}
        >
          {isAIGenerated ? "AI Generated" : "Manual"}
        </span>

        {/* Time */}
        {note.createdAt && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatTime(note.createdAt)}
          </span>
        )}
      </div>
    </button>
  );
}
