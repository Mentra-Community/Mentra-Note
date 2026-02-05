/**
 * NotesTab - Displays notes for a specific day
 *
 * Shows:
 * - Masonry grid of note cards (manual and AI-generated)
 * - FAB that opens QuickActionsDrawer
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useMentraAuth } from "@mentra/react";
import { Plus, Loader2, FileText } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
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

  // Empty state
  if (notes.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-64 text-center px-6 mt-12">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
            <FileText size={24} />
          </div>
          <h3 className="text-zinc-900 dark:text-white font-medium mb-1">
            No notes yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-[240px]">
            Create a note manually or generate one from the transcript using the
            button below.
          </p>
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowQuickActions(true)}
          disabled={generating}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-zinc-900 dark:bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 z-40"
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

        <QuickActionsDrawer
          isOpen={showQuickActions}
          onClose={() => setShowQuickActions(false)}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-32">
      <div className="p-4 pt-6">
        {/* Masonry Grid */}
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 3 }}>
          <Masonry gutter="10px">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note)}
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowQuickActions(true)}
        disabled={generating}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-zinc-900 dark:bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 z-40"
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
