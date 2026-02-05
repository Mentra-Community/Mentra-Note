import React, { useState } from 'react';
import { Note } from '@/app/lib/mockData';
import { FileText, Plus, Sparkles, PenLine, X, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { motion, AnimatePresence } from 'motion/react';
import { Drawer } from 'vaul';
import { format, addMinutes, setHours, setMinutes, roundToNearestMinutes } from 'date-fns';

interface NotesTabProps {
  notes: Note[];
  onAddNote: () => void;
  onGenerateNote: (start: Date, end: Date) => void; // New prop
  onNoteClick: (note: Note) => void;
  folderDate: Date; // Needed for default date in generator
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes, onAddNote, onGenerateNote, onNoteClick, folderDate }) => {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Helper to extract plain text for preview
  const getPreviewText = (htmlContent: string) => {
      // Basic strip tags
      return htmlContent.replace(/<[^>]*>?/gm, ' ').substring(0, 150).trim();
  };

  return (
    <div className="p-4 pt-6 pb-32 relative min-h-full">
        {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6 mt-12">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                    <FileText size={24} />
                </div>
                <h3 className="text-zinc-900 dark:text-white font-medium mb-1">No notes yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-[240px]">
                    Create a note manually or generate one from the transcript using the button below.
                </p>
            </div>
        ) : (
            <ResponsiveMasonry
                columnsCountBreakPoints={{350: 2, 750: 3}}
            >
                <Masonry gutter="12px">
                    {notes.map((note) => {
                        const isAI = note.source === 'AI';
                        return (
                            <div 
                                key={note.id}
                                onClick={() => onNoteClick(note)}
                                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col gap-3 min-h-[100px]"
                            >
                                <h3 className="font-semibold text-[15px] leading-snug text-zinc-900 dark:text-white">
                                    {note.title}
                                </h3>
                                
                                <div className="text-xs leading-relaxed line-clamp-[8] text-zinc-500 dark:text-zinc-400">
                                     {note.summary || getPreviewText(note.content || "")}
                                </div>

                                {/* Metadata Footer */}
                                <div className="mt-2 pt-3 flex flex-wrap gap-2 items-center border-t border-zinc-100 dark:border-zinc-800">
                                     {isAI && (
                                         <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                             AI Generated
                                         </span>
                                     )}
                                     {!isAI && (
                                         <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                             Manual
                                         </span>
                                     )}
                                     
                                     {note.timeRange && isAI && (
                                         <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500">
                                             {note.timeRange.split('-')[0].trim()}
                                         </span>
                                     )}
                                </div>
                            </div>
                        );
                    })}
                </Masonry>
            </ResponsiveMasonry>
        )}

        {/* FAB System */}
        <div className="fixed bottom-24 right-6 z-40 flex flex-col-reverse items-end gap-3">
            {/* Main Toggle FAB */}
            <button
                onClick={() => setIsFabOpen(!isFabOpen)}
                className={clsx(
                    "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 z-50",
                    isFabOpen ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rotate-45" : "bg-black dark:bg-white text-white dark:text-black"
                )}
            >
                {isFabOpen ? <Plus size={28} /> : <PenLine size={24} />}
            </button>

            {/* Expanded Options - Stacked Vertically */}
            <AnimatePresence>
                {isFabOpen && (
                    <>
                         {/* Option A: Manual Note (Bottom) */}
                         <motion.button
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            transition={{ delay: 0.05 }}
                            onClick={() => {
                                setIsFabOpen(false);
                                onAddNote();
                            }}
                            className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg text-zinc-900 dark:text-white font-medium text-sm whitespace-nowrap"
                        >
                            <span>Add note</span>
                            <PenLine size={18} />
                        </motion.button>

                        {/* Option B: Generate Note (Top) */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            onClick={() => {
                                setIsFabOpen(false);
                                setIsGenerateModalOpen(true);
                            }}
                            className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg text-zinc-900 dark:text-white font-medium text-sm whitespace-nowrap"
                        >
                            <span>Generate note</span>
                            <Sparkles size={18} />
                        </motion.button>
                    </>
                )}
            </AnimatePresence>
        </div>

        {/* Removed Backdrop for FAB as requested */}

        {/* Generate Note Modal */}
        <GenerateNoteModal 
            isOpen={isGenerateModalOpen} 
            onClose={() => setIsGenerateModalOpen(false)}
            onConfirm={onGenerateNote}
            date={folderDate}
        />
    </div>
  );
};

const GenerateNoteModal = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    date
}: { 
    isOpen: boolean; 
    onClose: () => void;
    onConfirm: (start: Date, end: Date) => void;
    date: Date;
}) => {
    // Default to 9:00 AM - 10:00 AM of the folder date
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");

    const handleConfirm = () => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        
        const start = setMinutes(setHours(date, startH), startM);
        const end = setMinutes(setHours(date, endH), endM);
        
        onConfirm(start, end);
        onClose();
    };

    // Generate time options in 15 min increments
    const timeOptions = [];
    for (let i = 0; i < 24 * 4; i++) {
        const h = Math.floor(i / 4);
        const m = (i % 4) * 15;
        const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const label = format(setMinutes(setHours(new Date(), h), m), 'h:mm a');
        timeOptions.push({ value: timeString, label });
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={open => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto outline-none">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Sparkles size={18} className="text-zinc-900 dark:text-white" />
                            Generate Summary
                        </Drawer.Title>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Select a time range from the transcript to generate a focused summary note.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Start Time</label>
                                <div className="relative">
                                    <select 
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500"
                                    >
                                        {timeOptions.map(opt => (
                                            <option key={`start-${opt.value}`} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">End Time</label>
                                <div className="relative">
                                    <select 
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500"
                                    >
                                        {timeOptions.map(opt => (
                                            <option key={`end-${opt.value}`} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleConfirm}
                            className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={18} />
                            <span>Generate Note</span>
                        </button>
                    </div>
                    <div className="h-6" /> 
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};
