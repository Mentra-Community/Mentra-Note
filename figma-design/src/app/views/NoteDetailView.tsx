import React, { useState } from 'react';
import { Note } from '@/app/lib/mockData';
import { ChevronLeft, MoreVertical, Bold, Italic, List } from 'lucide-react';
import { clsx } from 'clsx';

interface NoteDetailViewProps {
  note: Note;
  onBack: () => void;
  onDelete?: () => void;
}

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({ note, onBack, onDelete }) => {
  const [title, setTitle] = useState(note.title);
  
  // Use content if available, otherwise construct from legacy fields for fallback
  const initialContent = note.content || `
<b>Summary</b>
${note.summary}

${note.decisions && note.decisions.length > 0 ? `<b>Key Decisions</b>
<ul>${note.decisions.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}

${note.actionItems && note.actionItems.length > 0 ? `<b>Action Items</b>
<ul>${note.actionItems.map(i => `<li>${i.text}</li>`).join('')}</ul>` : ''}
  `;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* Top App Bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-white dark:bg-black z-20 sticky top-0">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
              <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          
          <div className="flex-1" />
          
          <button 
             className="p-2 -mr-2 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
              <MoreVertical size={20} strokeWidth={1.5} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
          <div className="px-6 pb-32">
              {/* Title */}
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder-zinc-400 mb-2"
                placeholder="Note Title"
              />

              {/* Time Range Text */}
              {note.timeRange && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-3">
                      {note.timeRange}
                  </div>
              )}

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 items-center mb-6">
                  {note.source === 'AI' && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          AI Generated
                      </span>
                  )}
                  
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Just now
                  </span>
              </div>

              {/* Editor Body */}
              <div 
                className="w-full outline-none text-[16px] leading-[1.6] text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: initialContent }}
                style={{ minHeight: '300px' }}
              />
          </div>
      </div>

      {/* Formatting Toolbar - Sticky Bottom */}
      <div className="h-12 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-8 bg-white dark:bg-black pb-safe fixed bottom-0 left-0 right-0 z-20">
          <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <List size={20} strokeWidth={2} />
          </button>
          <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Bold size={20} strokeWidth={2} />
          </button>
          <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Italic size={20} strokeWidth={2} />
          </button>
      </div>
    </div>
  );
};
