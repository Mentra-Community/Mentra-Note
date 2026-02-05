import React, { useState } from 'react';
import { AudioRecording } from '@/app/lib/mockData';
import { Play, Pause, ChevronDown, AlignLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface AudioTabProps {
  recordings: AudioRecording[];
}

export const AudioTab: React.FC<AudioTabProps> = ({ recordings }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleTranscription = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  return (
    <div className="flex flex-col pb-32">
      {recordings.map((rec) => {
        const isExpanded = expandedIds.has(rec.id);
        
        return (
            <div key={rec.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div 
                    className="flex items-center gap-4 px-6 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group cursor-pointer"
                    onClick={() => toggleTranscription(rec.id)}
                >
                    <button 
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Handle play logic here
                        }}
                    >
                        {rec.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1">{rec.title}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{rec.duration}</span>
                            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-400 uppercase tracking-wide">{rec.source}</span>
                            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                             <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                                {rec.createdAt}
                            </span>
                        </div>
                    </div>

                    <div className={clsx("text-zinc-300 dark:text-zinc-600 transition-transform duration-200", isExpanded && "rotate-180")}>
                        <ChevronDown size={18} />
                    </div>
                </div>

                {/* Transcription Section */}
                {isExpanded && (
                    <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                <AlignLeft size={14} className="text-zinc-400" />
                                Transcript Preview
                            </h4>
                            <div className="pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal whitespace-pre-wrap italic">
                                    "{rec.transcription || "No transcription available for this recording."}"
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
      })}
       {recordings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">No audio recordings</p>
        </div>
      )}
    </div>
  );
};
