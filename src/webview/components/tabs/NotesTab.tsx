/**
 * NotesTab - Notes list and management interface
 *
 * Uses useSynced to communicate with the backend NotesManager
 */

import React, { useState } from "react";
import {
  Sparkles,
  X,
  Loader2,
  Edit2,
  Save,
  Trash2,
  Star,
  FileText,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import { useSynced } from "../../../synced/useSynced";
import type { SessionI, Note } from "../../../synced/types";
import { useMentraAuth } from "@mentra/react";

// Display format for notes (matches mockData format for compatibility)
interface DisplayNote {
  id: string;
  title: string;
  createdAt: string;
  summary: string;
  decisions: string[];
  actionItems: { text: string; done: boolean }[];
  isPinned?: boolean;
}

interface NotesTabProps {
  notes: DisplayNote[];
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes: initialNotes = [],
}) => {
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  // Local UI state
  const [creationMode, setCreationMode] = useState<"none" | "ai" | "manual">(
    "none",
  );
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
  }>({ title: "", content: "" });

  // Get state from session
  const generating = session?.notes?.generating ?? false;
  const syncedNotes = session?.notes?.notes ?? [];

  // Convert synced notes to display format and merge with initial notes
  const displayNotes: DisplayNote[] =
    syncedNotes.length > 0
      ? syncedNotes.map((note: Note) => ({
          id: note.id,
          title: note.title,
          createdAt: note.createdAt
            ? new Date(note.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          summary: note.summary || note.content?.substring(0, 200) || "",
          decisions: [],
          actionItems: [],
          isPinned: false,
        }))
      : initialNotes;

  // Generate AI note
  const handleGenerate = async () => {
    if (!session?.notes?.generateNote) return;

    try {
      await session.notes.generateNote();
      setCreationMode("none");
    } catch (error) {
      console.error("[NotesTab] Failed to generate note:", error);
    }
  };

  // Create manual note
  const handleCreateManual = async () => {
    if (!manualTitle.trim() || !session?.notes?.createManualNote) return;

    try {
      const note = await session.notes.createManualNote(
        manualTitle.trim(),
        manualContent.trim() || "New note.",
      );

      setManualTitle("");
      setManualContent("");
      setCreationMode("none");

      // Start editing the new note
      if (note) {
        startEditing(note.id, note.title, note.content || "");
      }
    } catch (error) {
      console.error("[NotesTab] Failed to create manual note:", error);
    }
  };

  // Start editing a note
  const startEditing = (id: string, title: string, content: string) => {
    setEditingNoteId(id);
    setEditForm({ title, content });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditForm({ title: "", content: "" });
  };

  // Save edited note
  const saveNote = async (id: string) => {
    if (!session?.notes?.updateNote) return;

    try {
      await session.notes.updateNote(id, {
        title: editForm.title,
        content: editForm.content,
        summary:
          editForm.content.length > 200
            ? editForm.content.substring(0, 200) + "..."
            : editForm.content,
      });
      setEditingNoteId(null);
    } catch (error) {
      console.error("[NotesTab] Failed to save note:", error);
    }
  };

  // Delete note
  const deleteNote = async (id: string) => {
    if (!session?.notes?.deleteNote) return;

    try {
      await session.notes.deleteNote(id);
      if (editingNoteId === id) {
        setEditingNoteId(null);
      }
    } catch (error) {
      console.error("[NotesTab] Failed to delete note:", error);
    }
  };

  return (
    <div className="flex flex-col pb-32 px-6 py-6 space-y-6">
      {/* Creation Mode Controls */}
      {creationMode === "none" ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCreationMode("ai")}
            disabled={!isConnected}
            className="py-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-900/20 group-hover:scale-110 transition-transform">
              <Sparkles
                size={20}
                className="text-amber-500 dark:text-amber-400"
              />
            </div>
            <span className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
              Generate AI Summary
            </span>
          </button>

          <button
            onClick={() => setCreationMode("manual")}
            disabled={!isConnected}
            className="py-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:scale-110 transition-transform">
              <Plus size={20} className="text-blue-500 dark:text-blue-400" />
            </div>
            <span className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
              Write Manual Note
            </span>
          </button>
        </div>
      ) : creationMode === "ai" ? (
        /* AI Generation Panel */
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Sparkles
                  size={18}
                  className="text-amber-600 dark:text-amber-400"
                />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">
                  Generate AI Summary
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Create a note from your recent transcripts
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreationMode("none")}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} className="text-zinc-500" />
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !isConnected}
            className={clsx(
              "w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
              generating || !isConnected
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90",
            )}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Note
              </>
            )}
          </button>
        </div>
      ) : (
        /* Manual Creation Panel */
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">
                  Write Manual Note
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Create a note with your own content
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCreationMode("none");
                setManualTitle("");
                setManualContent("");
              }}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} className="text-zinc-500" />
            </button>
          </div>

          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />

          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            placeholder="Write your note content..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
          />

          <button
            onClick={handleCreateManual}
            disabled={!manualTitle.trim() || !isConnected}
            className={clsx(
              "w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
              !manualTitle.trim() || !isConnected
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90",
            )}
          >
            <Plus size={16} />
            Create Note
          </button>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {displayNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-zinc-400" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No notes yet
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
              Generate an AI summary or write a manual note
            </p>
          </div>
        ) : (
          displayNotes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className={clsx(
                  "border rounded-xl p-5 transition-all",
                  note.isPinned
                    ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
                )}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Note title..."
                    />

                    <textarea
                      value={editForm.content}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={6}
                      placeholder="Note content..."
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveNote(note.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-colors flex items-center gap-2"
                      >
                        <Save size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                          {note.title}
                        </h3>
                        <span className="text-xs text-zinc-400">
                          {note.createdAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            startEditing(
                              note.id,
                              note.title,
                              note.summary || "",
                            )
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {note.summary}
                    </p>

                    {note.decisions && note.decisions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          Key Points
                        </h4>
                        <ul className="space-y-1">
                          {note.decisions.map((decision, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                            >
                              <span className="text-zinc-400">•</span>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
