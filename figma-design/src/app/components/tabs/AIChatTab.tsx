import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, Bot, User } from 'lucide-react';
import { clsx } from 'clsx';

interface AIChatTabProps {
    date: Date;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

const SUGGESTIONS = [
    "Summarize my day",
    "List action items",
    "What did I discuss in the morning?",
    "Any deadlines mentioned?"
];

export const AIChatTab: React.FC<AIChatTabProps> = ({ date }) => {
  const [messages, setMessages] = useState<Message[]>([
      {
          id: 'welcome',
          role: 'assistant',
          text: 'I can analyze your audio, notes, and transcriptions for this day. What would you like to know?'
      }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages, isLoading]);

  const handleSend = (text: string = input) => {
      if(!text.trim()) return;
      
      const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      // Simulate AI response
      setTimeout(() => {
          setIsLoading(false);
          setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              text: "Based on your recordings, you discussed the Q3 roadmap during the 10 AM standup. The key decisions were to prioritize the mobile redesign (assignee: Sarah) and delay the API migration to next month."
          }]);
      }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors relative">
       {/* Chat Area */}
       <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32 scrollbar-hide"
        >
           {messages.map((msg, index) => {
               const isAssistant = msg.role === 'assistant';
               return (
                   <div 
                        key={msg.id} 
                        className={clsx(
                            "flex gap-4",
                            isAssistant ? "items-start" : "flex-row-reverse"
                        )}
                   >
                       {/* Avatar */}
                       <div className={clsx(
                           "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                           isAssistant 
                            ? "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100" 
                            : "bg-zinc-900 dark:bg-zinc-100 border-transparent text-white dark:text-zinc-900"
                       )}>
                           {isAssistant ? <Sparkles size={14} /> : <User size={14} />}
                       </div>

                       {/* Bubble */}
                       <div className={clsx(
                           "flex flex-col max-w-[80%]",
                           isAssistant ? "items-start" : "items-end"
                       )}>
                           <div className={clsx(
                               "px-4 py-3 text-[15px] leading-relaxed",
                               isAssistant 
                                ? "bg-transparent text-zinc-800 dark:text-zinc-300 -ml-2" 
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm"
                           )}>
                               {msg.text}
                           </div>
                       </div>
                   </div>
               );
           })}

           {isLoading && (
               <div className="flex gap-4 items-start animate-pulse">
                   <div className="w-8 h-8 rounded-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                       <Sparkles size={14} className="text-zinc-400" />
                   </div>
                   <div className="flex items-center gap-1 h-8 px-2">
                       <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                       <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-75" />
                       <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-150" />
                   </div>
               </div>
           )}

            {/* Suggestions (only show if few messages) */}
            {messages.length === 1 && !isLoading && (
                <div className="grid grid-cols-1 gap-2 mt-8">
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            onClick={() => handleSend(suggestion)}
                            className="text-left text-sm py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
       </div>

       {/* Input Area */}
       {/* Adjusted padding to pull box down above nav bar (pb-20 -> pb-6) since view ends at nav bar */}
       <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black dark:to-transparent pt-10 pb-6 px-6 z-10">
           <div className="relative flex items-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
               <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about this day..."
                    className="w-full bg-transparent rounded-full pl-5 pr-12 py-3.5 text-[15px] focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-white"
               />
               <button 
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={clsx(
                    "absolute right-2 p-2 rounded-full transition-all duration-200",
                    input.trim() 
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-black scale-100" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 scale-90"
                )}
               >
                   <ArrowUp size={18} strokeWidth={2.5} />
               </button>
           </div>
       </div>
    </div>
  );
};
