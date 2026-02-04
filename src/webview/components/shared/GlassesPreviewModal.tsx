import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { X, Mic, Battery, Wifi, Clock, MessageSquare, List, AlertTriangle, Check } from 'lucide-react';

interface GlassesPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlassesPreviewModal: React.FC<GlassesPreviewModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none text-white overflow-hidden">
         {/* Dialog Header required for accessibility but hidden visually or styled minimally */}
         <div className="sr-only">
             <DialogHeader>
                 <DialogTitle>Glasses HUD Preview</DialogTitle>
                 <DialogDescription>Preview of what is displayed on the smart glasses.</DialogDescription>
             </DialogHeader>
         </div>

         {/* Glasses Frame Container */}
         <div className="relative w-full aspect-video bg-black/90 rounded-3xl border-8 border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl">

             {/* Reflection / Glare Effect */}
             <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-10" />

             {/* Close Button */}
             <button
                onClick={() => onOpenChange(false)}
                className="absolute top-6 right-6 z-50 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-colors"
             >
                 <X size={20} className="text-white" />
             </button>

             {/* HUD Interface - Left Eye (Monocular or Bi-ocular simulation) */}
             <div className="absolute inset-0 p-12 flex flex-col font-mono text-green-400">

                 {/* Top Bar */}
                 <div className="flex justify-between items-start opacity-80 mb-8">
                     <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                             <Clock size={16} />
                             <span>14:05</span>
                         </div>
                         <div className="flex items-center gap-2 text-red-500 animate-pulse">
                             <Mic size={16} />
                             <span>REC 12:04</span>
                         </div>
                     </div>
                     <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                             <Wifi size={16} />
                             <span>5G</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <Battery size={16} />
                             <span>84%</span>
                         </div>
                     </div>
                 </div>

                 {/* Main Content Area */}
                 <div className="flex-1 flex items-center justify-center">
                     <div className="max-w-lg w-full space-y-6">

                         {/* Live Transcription Snippet */}
                         <div className="space-y-2">
                             <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-50">
                                 <MessageSquare size={12} /> Live Transcript
                             </div>
                             <p className="text-xl leading-relaxed text-white drop-shadow-md">
                                 "So the consensus is we <span className="text-green-400 font-bold bg-green-400/10 px-1 rounded">delay backend migration</span> until Q4."
                             </p>
                         </div>

                         {/* Extracted Insight */}
                         <div className="bg-zinc-900/80 border border-green-500/30 p-4 rounded-xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700">
                             <div className="flex items-center gap-2 text-green-400 mb-2 font-bold uppercase text-xs tracking-wider">
                                 <Check size={14} /> Decision Detected
                             </div>
                             <p className="text-lg text-white">Migration postponed to Q4 2026</p>
                         </div>

                         {/* Alert / Context */}
                         <div className="flex items-center gap-3 text-amber-400 opacity-80">
                             <AlertTriangle size={16} />
                             <span className="text-sm">Context: This contradicts the roadmap from Jan 15.</span>
                         </div>

                     </div>
                 </div>

                 {/* Bottom Bar */}
                 <div className="flex justify-between items-end opacity-60">
                     <div className="flex gap-6 text-sm">
                         <div className="flex items-center gap-2">
                             <List size={14} />
                             <span>3 Decisions</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <Check size={14} />
                             <span>5 Actions</span>
                         </div>
                     </div>
                     <div className="text-xs">
                         Executive Lens OS v2.1
                     </div>
                 </div>

             </div>
         </div>

         <div className="text-center mt-4 text-zinc-500 text-sm">
             Simulated View - Executive Lens Vision Pro
         </div>
      </DialogContent>
    </Dialog>
  );
};
