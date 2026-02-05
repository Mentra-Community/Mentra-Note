/**
 * NotesTab - Displays notes for a specific day
 *
 * Shows:
 * - Grid of note cards (manual and AI-generated)
 * - FAB that opens QuickActionsDrawer
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { Plus, Loader2 } from "lucide-react";
import { useSynced } from "../../../../hooks/useSynced";
import type { SessionI, Note } from "../../../../../shared/types";
import { NoteCard } from "../NoteCard";
import { QuickActionsDrawer } from "../../../../components/shared/QuickActionsDrawer";

interface NotesTabProps {
  notes: Note[];
  dateString: string;
}

export function NotesTab({ notes, dateString }: NotesTabProps) {
  const { userId } = useMentraAuth();
  const { session } = useSynced<SessionI>(userId || "");
  const [, setLocation] = useLocation();

  const [showQuickActions, setShowQuickActions] = useState(false);

  const generating = session?.notes?.generating ?? false;

  const handleCreateManualNote = async () => {
    if (!session?.notes?.createManualNote) return;

    try {
      const note = await session.notes.createManualNote("New Note", "");
      // Navigate to the note editor
      setLocation(`/note/${note.id}`);
    } catch (err) {
      console.error("[NotesTab] Failed to create note:", err);
    }
  };

  const handleNoteClick = (note: Note) => {
    setLocation(`/note/${note.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Notes Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* New Note Card */}
          <button
            onClick={handleCreateManualNote}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-2xl p-4 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-40 flex flex-col"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
              New Note
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-1">
              Tap to edit this note...
            </p>
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded uppercase tracking-wide">
                Manual
              </span>
            </div>
          </button>

          {/* Existing Notes */}
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => handleNoteClick(note)}
            />
          ))}
        </div>

        {/* Empty state if no notes */}
        {notes.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-sm">No notes for this day yet</p>
            <p className="text-xs mt-1">
              Create a note or generate one from your transcript
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowQuickActions(true)}
        disabled={generating}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-zinc-900 dark:bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 z-40"
      >
        {generating ? (
          <Loader2
            size={24}
            className="text-white dark:text-zinc-900 animate-spin"
          />
        ) : (
          <Plus size={24} className="text-white dark:text-zinc-900" />
        )}
      </button>

      {/* Quick Actions Drawer */}
      <QuickActionsDrawer
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </div>
  );
}
