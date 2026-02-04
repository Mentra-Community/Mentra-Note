import React, { useState } from 'react';
import { Note } from '../../lib/mockData';
import { CheckSquare, Square, Sparkles, X, Loader2, ArrowRight, Edit2, Save, Trash2, Star, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface NotesTabProps {
  notes: Note[];
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes: initialNotes }) => {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [creationMode, setCreationMode] = useState<'none' | 'ai' | 'manual'>('none');
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:30");
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual Create State
  const [manualTitle, setManualTitle] = useState("");

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
      summary: string;
      decisions: string;
      actionItems: string;
  }>({ summary: '', decisions: '', actionItems: '' });

  const handleGenerate = () => {
      setIsProcessing(true);

      // Simulate API call
      setTimeout(() => {
          const newNote: Note = {
              id: Date.now().toString(),
              title: `Summary (${startTime} - ${endTime})`,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              summary: "This session focused on aligning the team on the Q3 strategic goals. Key discussions included the prioritization of the mobile application redesign and postponing the backend migration to ensure stability.",
              decisions: [
                  "Prioritize Q3 Mobile Redesign",
                  "Postpone API migration"
              ],
              actionItems: [
                  { text: "Update Jira backlog", done: false },
                  { text: "Email stakeholders", done: false }
              ]
          };

          setNotes(prev => [newNote, ...prev]);
          setIsProcessing(false);
          setCreationMode('none');
      }, 1500);
  };

  const handleCreateManual = () => {
      if (!manualTitle.trim()) return;

      const newNote: Note = {
          id: Date.now().toString(),
          title: manualTitle,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          summary: "New empty note.",
          decisions: [],
          actionItems: []
      };

      setNotes(prev => [newNote, ...prev]);
      setManualTitle("");
      setCreationMode('none');

      // Immediately start editing the new note
      startEditing(newNote);
  };

  const startEditing = (note: Note) => {
      setEditingNoteId(note.id);
      setEditForm({
          summary: note.summary,
          decisions: note.decisions.join('\n'),
          actionItems: note.actionItems.map(item => item.text).join('\n')
      });
  };

  const cancelEditing = () => {
      setEditingNoteId(null);
      setEditForm({ summary: '', decisions: '', actionItems: '' });
  };

  const saveNote = (id: string) => {
      setNotes(prev => prev.map(note => {
          if (note.id === id) {
              return {
                  ...note,
                  summary: editForm.summary,
                  decisions: editForm.decisions.split('\n').filter(line => line.trim() !== ''),
                  actionItems: editForm.actionItems.split('\n').filter(line => line.trim() !== '').map(text => {
                      return { text: text.trim(), done: false };
                  })
              };
          }
          return note;
      }));
      setEditingNoteId(null);
  };

  const deleteNote = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setNotes(prev => prev.map(note => {
          if (note.id === id) {
              return { ...note, isPinned: !note.isPinned };
          }
          return note;
      }));
  };

  return (
    <div className="flex flex-col pb-32 px-6 py-6 space-y-6">

      {/* Creation Mode Controls */}
      {creationMode === 'none' ? (
          <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCreationMode('ai')}
                className="py-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
              >
                  <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-900/20 group-hover:scale-110 transition-transform">
                    <Sparkles size={20} className="text-amber-500 dark:text-amber-400" />
                  </div>
                  <span className="font-medium text-sm">Generate AI Summary</span>
              </button>

              <button
                onClick={() => setCreationMode('manual')}
                className="py-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
              >
                  <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:scale-110 transition-transform">
                    <Edit2 size={20} className="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <span className="font-medium text-sm">Write Manual Note</span>
              </button>
          </div>
      ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-semibold text-sm">
                      {creationMode === 'ai' ? (
                          <>
                            <Sparkles size={16} className="text-amber-500" />
                            <span>Generate Summary</span>
                          </>
                      ) : (
                          <>
                            <FileText size={16} className="text-zinc-900 dark:text-white" />
                            <span>New Manual Note</span>
                          </>
                      )}
                  </div>
                  <button onClick={() => setCreationMode('none')} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                      <X size={18} />
                  </button>
              </div>

              {creationMode === 'ai' ? (
                  <>
                      <div className="space-y-3">
                          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Time Window</label>
                          <div className="flex items-center gap-3">
                              <div className="flex-1">
                                  <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-600"
                                  />
                              </div>
                              <ArrowRight size={14} className="text-zinc-400" />
                              <div className="flex-1">
                                  <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-600"
                                  />
                              </div>
                          </div>
                      </div>

                      <button
                        onClick={handleGenerate}
                        disabled={isProcessing}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                          {isProcessing ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Generating...</span>
                              </>
                          ) : (
                              "Generate Note"
                          )}
                      </button>
                  </>
              ) : (
                  <>
                      <div className="space-y-3">
                          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Title</label>
                          <input
                            type="text"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="e.g. Brainstorming Session"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-600"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateManual()}
                          />
                      </div>
                      <button
                        onClick={handleCreateManual}
                        disabled={!manualTitle.trim()}
                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                          Create Note
                      </button>
                  </>
              )}
          </div>
      )}

      {/* Notes List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {notes.map((note) => {
            const isEditing = editingNoteId === note.id;

            if (isEditing) {
                return (
                    <div
                        key={note.id}
                        className="border border-zinc-300 dark:border-zinc-600 ring-2 ring-zinc-200 dark:ring-zinc-800 rounded-lg p-5 bg-white dark:bg-zinc-900 shadow-md animate-in fade-in duration-200"
                    >
                         <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">Editing Note</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={cancelEditing} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500">
                                    <X size={16} />
                                </button>
                                <button onClick={() => saveNote(note.id)} className="p-1.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 rounded-md text-white dark:text-black">
                                    <Save size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Summary</label>
                                <textarea
                                    value={editForm.summary}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
                                    className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Decisions (one per line)</label>
                                <textarea
                                    value={editForm.decisions}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, decisions: e.target.value }))}
                                    className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Tasks (one per line)</label>
                                <textarea
                                    value={editForm.actionItems}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, actionItems: e.target.value }))}
                                    className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
                                />
                             </div>

                             <div className="pt-2 flex justify-between items-center">
                                 <button
                                    onClick={() => deleteNote(note.id)}
                                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                 >
                                     <Trash2 size={14} />
                                     Delete Note
                                 </button>
                             </div>
                        </div>
                    </div>
                )
            }

            return (
                <div
                    key={note.id}
                    className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all duration-300 ease-out"
                >
                    {/* Hover Actions (Pin & Edit) */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                         <button
                            onClick={(e) => togglePin(note.id, e)}
                            className={clsx(
                                "p-2 rounded-full transition-all backdrop-blur-sm",
                                note.isPinned
                                    ? "bg-yellow-50 text-yellow-500 dark:bg-yellow-900/20"
                                    : "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-yellow-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            )}
                            title={note.isPinned ? "Unpin Note" : "Pin Note"}
                        >
                            <Star size={14} fill={note.isPinned ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => startEditing(note)}
                            className="p-2 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all backdrop-blur-sm"
                            title="Edit Note"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>

                    {/* Header */}
                    <div className="flex flex-col gap-1 pr-20">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                            {note.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                             <span>{note.createdAt}</span>
                             {note.isPinned && (
                                 <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                    <span className="text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                                        <Star size={10} fill="currentColor" /> Pinned
                                    </span>
                                 </>
                             )}
                        </div>
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full" />

                    {/* Content Grid */}
                    <div className="flex flex-col gap-6">
                        {/* Summary */}
                        <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            {note.summary}
                        </div>

                        {/* Decisions Section */}
                        {note.decisions.length > 0 && (
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest">Key Decisions</h4>
                                </div>
                                <ul className="grid gap-2.5">
                                    {note.decisions.map((d, i) => (
                                        <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-3">
                                            <ArrowRight size={14} className="mt-1 text-indigo-400/70 shrink-0" />
                                            <span className="leading-relaxed">{d}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Items Section */}
                        {note.actionItems.length > 0 && (
                            <div>
                                 <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest">Action Items</h4>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {note.actionItems.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                const updatedNotes = notes.map(n => {
                                                    if (n.id === note.id) {
                                                        const newActionItems = [...n.actionItems];
                                                        newActionItems[i] = { ...newActionItems[i], done: !newActionItems[i].done };
                                                        return { ...n, actionItems: newActionItems };
                                                    }
                                                    return n;
                                                });
                                                setNotes(updatedNotes);
                                            }}
                                            className={clsx(
                                                "group/item flex items-start gap-3 p-3 rounded-lg text-left transition-all border border-transparent",
                                                item.done
                                                    ? "bg-zinc-50 dark:bg-zinc-900/50 opacity-60"
                                                    : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-100 dark:border-zinc-800 shadow-sm"
                                            )}
                                        >
                                            <div className={clsx(
                                                "mt-0.5 transition-colors",
                                                item.done ? "text-emerald-500" : "text-zinc-300 group-hover/item:text-zinc-400"
                                            )}>
                                                {item.done ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <span className={clsx(
                                                "text-sm leading-relaxed transition-all",
                                                item.done ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"
                                            )}>
                                                {item.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}

        {notes.length === 0 && creationMode === 'none' && (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60 col-span-full">
                <p className="text-zinc-400 dark:text-zinc-600 text-sm">No notes created yet.</p>
                <p className="text-xs text-zinc-300 dark:text-zinc-700 mt-1">Generate a summary or write a new note manually.</p>
            </div>
        )}
      </div>
    </div>
  );
};
