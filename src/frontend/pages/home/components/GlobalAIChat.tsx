/**
 * GlobalAIChat - "Ask Mentra" AI chat for cross-day search
 *
 * Features:
 * - Search across ALL days/notes/transcripts (not just one day)
 * - Slide-over panel (slide in from right)
 * - Welcome message with capability explanation
 * - Suggestion chips for common queries
 * - Chat interface with user/assistant messages
 *
 * Reference: figma-design/src/app/views/GlobalAIChat.tsx
 */

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { ChevronLeft, ArrowUp, Sparkles, User } from "lucide-react";

interface GlobalAIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Summarize my week",
  "What notes mention meetings?",
  "List all action items",
  "What did I discuss yesterday?",
];

export function GlobalAIChat({ isOpen, onClose }: GlobalAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can search across all your days, notes, and transcripts. What are you looking for?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Reset chat when closed
  useEffect(() => {
    if (!isOpen) {
      // Keep messages for now - could reset if preferred
    }
  }, [isOpen]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Replace with actual backend RPC call
    // For now, simulate a response
    setTimeout(() => {
      setIsLoading(false);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "I found some relevant information across your notes. This is a placeholder response - the actual global search functionality will be connected to the backend soon.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1e1f22] h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="shrink-0 px-4 py-4 border-b border-zinc-100 dark:border-[#3f4147] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ChevronLeft size={24} strokeWidth={1.5} />
            </button>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
              Ask Mentra
            </h1>
          </div>
          <div className="w-8 h-8 bg-zinc-100 dark:bg-[#3f4147] rounded-full flex items-center justify-center">
            <Sparkles size={16} className="text-zinc-900 dark:text-white" />
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-48"
        >
          {messages.map((msg) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={clsx(
                  "flex gap-3",
                  isAssistant ? "items-start" : "flex-row-reverse",
                )}
              >
                {/* Avatar */}
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                    isAssistant
                      ? "bg-white dark:bg-[#1e1f22] border-zinc-200 dark:border-[#3f4147] text-zinc-900 dark:text-zinc-100"
                      : "bg-zinc-900 dark:bg-zinc-100 border-transparent text-white dark:text-zinc-900",
                  )}
                >
                  {isAssistant ? <Sparkles size={14} /> : <User size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={clsx(
                    "flex flex-col max-w-[85%]",
                    isAssistant ? "items-start" : "items-end",
                  )}
                >
                  <div
                    className={clsx(
                      "px-4 py-3 text-[15px] leading-relaxed",
                      isAssistant
                        ? "text-zinc-800 dark:text-zinc-300"
                        : "bg-zinc-100 dark:bg-[#313338] text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 items-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1e1f22] border border-zinc-200 dark:border-[#3f4147] flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-zinc-400" />
              </div>
              <div className="flex items-center gap-1 h-8 px-2">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                  style={{ animationDelay: "75ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
              </div>
            </div>
          )}

          {/* Suggestions - only show if no user messages yet */}
          {messages.length === 1 && !isLoading && (
            <div className="grid grid-cols-1 gap-2 mt-4">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-left text-sm py-3 px-4 rounded-xl border border-zinc-200 dark:border-[#3f4147] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-[#1e1f22] dark:via-[#1e1f22] dark:to-transparent pt-10 pb-8 px-4">
          <div className="relative flex items-center rounded-full bg-white dark:bg-[#313338] border border-zinc-200 dark:border-[#3f4147] transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search your notes..."
              className="w-full bg-transparent rounded-full pl-5 pr-12 py-3.5 text-[15px] focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-white"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className={clsx(
                "absolute right-2 p-2 rounded-full transition-all duration-200",
                input.trim()
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-black scale-100"
                  : "bg-zinc-100 dark:bg-[#3f4147] text-zinc-300 dark:text-zinc-600 scale-90",
              )}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
