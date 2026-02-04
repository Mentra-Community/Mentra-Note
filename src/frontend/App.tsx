/**
 * Notes App - All-day transcription and AI-powered note generation
 *
 * Simplified interface with:
 * - Notes view as the main/only view
 * - Minimal settings
 * - Real-time transcription via WebSocket
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useMentraAuth } from "@mentra/react";
import { Toaster } from "sonner";
import { clsx } from "clsx";
import { useSynced } from "./hooks/useSynced";
import type { SessionI } from "../shared/types";
import { Settings, FileText, Wifi, WifiOff } from "lucide-react";

// Views
import { NotesView } from "./views/NotesView";
import { SettingsView } from "./views/SettingsView";

// =============================================================================
// Types
// =============================================================================

type ViewType = "notes" | "settings";

// =============================================================================
// App Component
// =============================================================================

export function App() {
  const { userId, isLoading, error } = useMentraAuth();

  // Use synced session for real-time state
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  // App state
  const [activeView, setActiveView] = useState<ViewType>("notes");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Toggle Theme Function
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Keyboard Navigation for Views
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "1" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveView("notes");
      }
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveView("settings");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg"
          >
            <span className="text-white dark:text-zinc-900 font-bold text-2xl">
              📝
            </span>
          </motion.div>
          <p className="text-zinc-500 dark:text-zinc-400">Loading Notes...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-red-500 mb-2">
            Authentication Error
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{error}</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">
            Open this page from the MentraOS app.
          </p>
        </motion.div>
      </div>
    );
  }

  // Render view based on activeView
  const renderView = () => {
    switch (activeView) {
      case "notes":
        return <NotesView />;
      case "settings":
        return (
          <SettingsView
            isDarkMode={theme === "dark"}
            onToggleTheme={toggleTheme}
          />
        );
      default:
        return <NotesView />;
    }
  };

  return (
    <div
      className={clsx(
        "flex h-screen w-full font-sans bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800",
        theme,
      )}
    >
      <Toaster position="top-center" theme={theme} />

      {/* Minimal Sidebar */}
      <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-4 gap-2 bg-white dark:bg-zinc-950">
        {/* App Icon */}
        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center mb-4">
          <span className="text-white dark:text-zinc-900 text-lg">📝</span>
        </div>

        {/* Nav Items */}
        <button
          onClick={() => setActiveView("notes")}
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            activeView === "notes"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900",
          )}
          title="Notes (⌘1)"
        >
          <FileText size={20} />
        </button>

        <button
          onClick={() => setActiveView("settings")}
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            activeView === "settings"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900",
          )}
          title="Settings (⌘,)"
        >
          <Settings size={20} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection Status */}
        <div
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isConnected ? "text-emerald-500" : "text-zinc-400",
          )}
          title={isConnected ? "Connected" : "Disconnected"}
        >
          {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-black relative">
        <main className="flex-1 overflow-hidden relative">{renderView()}</main>
      </div>
    </div>
  );
}
