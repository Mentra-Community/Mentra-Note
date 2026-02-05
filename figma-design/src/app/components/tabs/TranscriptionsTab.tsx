import React, { useState } from 'react';
import { TranscriptionSegment } from '@/app/lib/mockData';
import { clsx } from 'clsx';
import { format, getHours, setHours, startOfHour, isSameHour } from 'date-fns';
import { ChevronDown, ChevronRight, MoreHorizontal, Sparkles } from 'lucide-react';
import { Drawer } from 'vaul';

interface TranscriptionsTabProps {
  transcriptions: TranscriptionSegment[];
  onGenerateSummary?: (startHour: Date) => void;
}

export const TranscriptionsTab: React.FC<TranscriptionsTabProps> = ({ transcriptions, onGenerateSummary }) => {
  // Group transcriptions by hour
  const grouped = transcriptions.reduce((acc, curr) => {
    const hour = getHours(curr.timestamp);
    if (!acc[hour]) {
      acc[hour] = [];
    }
    acc[hour].push(curr);
    return acc;
  }, {} as Record<number, TranscriptionSegment[]>);

  if (transcriptions.length === 0) {
      return (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Listening for speech</p>
              <p className="text-sm">Keep Mentra Notes open to capture</p>
          </div>
      );
  }

  const hours = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const [expandedHours, setExpandedHours] = useState<number[]>([hours[hours.length - 1]]);

  const toggleHour = (hour: number) => {
      setExpandedHours(prev => 
          prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
      );
  };

  return (
    <div className="pb-20 pt-0">
      {hours.map(hour => {
          const isExpanded = expandedHours.includes(hour);
          const segments = grouped[hour];
          const hourLabel = format(setHours(new Date(), hour), 'h a'); // 9 AM

          return (
              <div key={hour} className="last:border-0 relative">
                  {/* Sticky Hour Header */}
                  <div 
                    className="sticky top-0 z-10 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-800"
                  >
                      <div 
                        onClick={() => toggleHour(hour)}
                        className="flex h-10 items-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                          {/* Left Gutter (64px) */}
                          <div className="w-16 flex-shrink-0 pl-4 flex items-center">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                  {hourLabel}
                              </span>
                          </div>
                          
                          {/* Right Content */}
                          <div className="flex-1 pr-4 flex items-center justify-between">
                              <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-zinc-800 mr-4" />
                              <div className="flex items-center gap-2">
                                  {/* Generate Button */}
                                  <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if(onGenerateSummary) onGenerateSummary(setHours(new Date(), hour));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-500 transition-all"
                                    title="Generate summary for this hour"
                                  >
                                      <Sparkles size={14} />
                                  </button>
                                  
                                  {isExpanded ? (
                                      <ChevronDown size={16} className="text-zinc-400" />
                                  ) : (
                                      <ChevronRight size={16} className="text-zinc-400" />
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Content */}
                  {isExpanded && (
                      <div className="pb-4 pt-2">
                          {segments.map(segment => (
                              <div key={segment.id} className="flex py-2 pr-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                  {/* Gutter with Timestamp */}
                                  <div className="w-16 flex-shrink-0 flex justify-end pr-3 pt-1">
                                      <span className="text-[11px] font-medium text-zinc-400 font-mono tracking-tight">
                                          {format(segment.timestamp, 'HH:mm')}
                                      </span>
                                  </div>
                                  
                                  {/* Text */}
                                  <div className="flex-1">
                                      <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                                          {segment.text}
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          );
      })}
    </div>
  );
};
