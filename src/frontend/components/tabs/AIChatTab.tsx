/**
 * AIChatTab - AI Chat interface wired to ChatManager
 *
 * Uses useSynced to communicate with the backend ChatManager
 */

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles, User, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useSynced } from "../../hooks/useSynced";
import type { SessionI, ChatMessage } from "../../../shared/types";
import { useMentraAuth } from "@mentra/react";

interface AIChatTabProps {
  date: Date;
}

const SUGGESTIONS = [
  "Summarize what I discussed today",
  "What were the main topics?",
  "List any action items mentioned",
  "What questions were asked?",
];

export const AIChatTab: React.FC<AIChatTabProps> = ({ date }) => {
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get chat state from session
  const messages = session?.chat?.messages ?? [];
  const isTyping = session?.chat?.isTyping ?? false;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !session?.chat?.sendMessage) return;

    setInput("");

    try {
      await session.chat.sendMessage(text.trim());
    } catch (error) {
      console.error("[AIChatTab] Failed to send message:", error);
    }
  };

  const handleClear = async () => {
    if (!session?.chat?.clearHistory) return;

    try {
      await session.chat.clearHistory();
    } catch (error) {
      console.error("[AIChatTab] Failed to clear history:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors relative">
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-32 scrollbar-hide"
      >
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
              <Sparkles size={14} />
            </div>
            <div className="flex flex-col max-w-[80%] items-start">
              <div className="px-4 py-3 text-[15px] leading-relaxed bg-transparent text-zinc-800 dark:text-zinc-300 -ml-2">
                I can help you understand your transcripts and notes. Ask me
                anything about what you've recorded today!
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg: ChatMessage) => {
          const isAssistant = msg.role === "assistant";
          return (
            <div
              key={msg.id}
              className={clsx(
                "flex gap-4",
                isAssistant ? "items-start" : "flex-row-reverse",
              )}
            >
              {/* Avatar */}
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  isAssistant
                    ? "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "bg-zinc-900 dark:bg-zinc-100 border-transparent text-white dark:text-zinc-900",
                )}
              >
                {isAssistant ? <Sparkles size={14} /> : <User size={14} />}
              </div>

              {/* Bubble */}
              <div
                className={clsx(
                  "flex flex-col max-w-[80%]",
                  isAssistant ? "items-start" : "items-end",
                )}
              >
                <div
                  className={clsx(
                    "px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
                    isAssistant
                      ? "bg-transparent text-zinc-800 dark:text-zinc-300 -ml-2"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm",
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 px-2">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-zinc-400" />
            </div>
            <div className="flex items-center gap-2 h-8 px-2">
              <Loader2 size={14} className="animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-400">Thinking...</span>
            </div>
          </div>
        )}

        {/* Suggestions (only show if no messages) */}
        {messages.length === 0 && !isTyping && (
          <div className="grid grid-cols-1 gap-2 mt-8">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                disabled={!isConnected}
                className="text-left text-sm py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black dark:to-transparent pt-10 pb-6 px-6 z-10">
        <div className="relative flex items-center shadow-lg dark:shadow-zinc-900/20 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected ? "Ask about your transcripts..." : "Connecting..."
            }
            disabled={!isConnected || isTyping}
            className="w-full bg-transparent rounded-full pl-5 pr-12 py-3.5 text-[15px] focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-white disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !isConnected || isTyping}
            className={clsx(
              "absolute right-2 p-2 rounded-full transition-all duration-200",
              input.trim() && isConnected && !isTyping
                ? "bg-zinc-900 dark:bg-white text-white dark:text-black scale-100"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 scale-90",
            )}
          >
            {isTyping ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Connection status */}
        {!isConnected && (
          <p className="text-center text-xs text-zinc-400 mt-2">
            Waiting for connection...
          </p>
        )}
      </div>
    </div>
  );
};
