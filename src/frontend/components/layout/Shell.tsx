/**
 * Shell - Responsive layout wrapper
 *
 * Provides:
 * - Mobile: Bottom tab bar navigation (Transcripts, Search, Notes, Settings)
 *
 * Handles responsive breakpoints and connection status display.
 */

import { ReactNode, createContext, useContext, useState, useCallback, useTransition, useEffect } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "motion/react";
import { useNavigation, type TabId } from "../../navigation/NavigationStack";
import { MicrophoneIcon, SearchIcon, DocumentIcon, SettingsIcon } from "../shared/custom-icons";

interface ShellProps {
  children: ReactNode;
}

type Tab = TabId;

interface TabBarContextValue {
  setHidden: (hidden: boolean) => void;
}

const TabBarContext = createContext<TabBarContextValue>({ setHidden: () => {} });

/** Pages call setHidden(true) to slide the tab bar out (e.g. during multi-select). */
export function useTabBar() {
  return useContext(TabBarContext);
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const nav = useNavigation();
  const [pageHidesTabBar, setPageHidesTabBar] = useState(false);

  const setHidden = useCallback((hidden: boolean) => {
    setPageHidesTabBar(hidden);
  }, []);

  const routeHidesTabBar =
    location.startsWith("/onboarding") ||
    location.endsWith("/generating") ||
    location.startsWith("/transcript/");

  const hideTabBar = routeHidesTabBar || pageHidesTabBar;

  // Optimistic indicator — flips immediately on tap so the spring starts on its
  // own frame, before the page swap. The provider is the source of truth for
  // which tab "owns" the current location (important for cross-tab pushes), so
  // we mirror `nav.activeTab` here and only diverge during the rAF window.
  const [activeTab, setActiveTab] = useState<Tab>(nav.activeTab);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setActiveTab(nav.activeTab);
  }, [nav.activeTab]);

  const handleNavigate = (tab: Tab) => {
    if (tab === activeTab) {
      // Same-tab tap → pop that tab's stack back to its root (iOS-style).
      nav.popToRoot(tab);
      return;
    }
    setActiveTab(tab); // paint the indicator slide first
    requestAnimationFrame(() => {
      startTransition(() => {
        nav.switchTab(tab);
      });
    });
  };

  return (
    <TabBarContext.Provider value={{ setHidden }}>
    <div className="flex h-screen w-full bg-[#FAFAF9]">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <main className={`flex-1 min-h-0 overflow-hidden relative ${routeHidesTabBar ? '' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom Tab Bar — slides down out of view when hidden, matching MultiSelectBar's slide-up */}
      <AnimatePresence>
      {!hideTabBar && <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
          className="[font-synthesis:none] fixed bottom-0 left-0 right-0 flex items-start justify-between pt-2.5 pb-5.5 px-7.5 bg-white border-t border-t-solid border-t-[#E8E5E1] antialiased z-30 min-h-20"
        >
          {/* Transcripts */}
          <button
            onClick={() => handleNavigate("transcripts")}
            className="flex flex-col items-center gap-1"
          >
            {/* Slot for the sliding indicator — always 2.5px tall so icons stay aligned */}
            <div className="h-[2.5px] flex items-center justify-center">
              {activeTab === "transcripts" && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="w-4 h-[2.5px] rounded-xs bg-[#D32F2F]"
                />
              )}
            </div>
            <MicrophoneIcon
              stroke={activeTab === "transcripts" ? "#D32F2F" : "#B8B2A9"}
              strokeWidth={activeTab === "transcripts" ? 1.6 : 1.5}
              style={{ flexShrink: 0 }}
            />
            <div
              className={`inline-block font-red-hat text-[10px]/3 ${
                activeTab === "transcripts"
                  ? "tracking-[0.2px] text-[#D32F2F] font-bold"
                  : "text-[#B8B2A9] font-medium"
              }`}
            >
              Transcripts
            </div>
          </button>

          {/* Search */}
          <button
            onClick={() => handleNavigate("search")}
            className="flex flex-col items-center gap-1"
          >
            <div className="h-[2.5px] flex items-center justify-center">
              {activeTab === "search" && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="w-4 h-[2.5px] rounded-xs bg-[#D32F2F]"
                />
              )}
            </div>
            <SearchIcon
              stroke={activeTab === "search" ? "#D32F2F" : "#B8B2A9"}
              strokeWidth={activeTab === "search" ? 1.6 : 1.5}
              style={{ flexShrink: 0 }}
            />
            <div
              className={`inline-block font-red-hat text-[10px]/3 ${
                activeTab === "search"
                  ? "tracking-[0.2px] text-[#D32F2F] font-bold"
                  : "text-[#B8B2A9] font-medium"
              }`}
            >
              Search
            </div>
          </button>

          {/* Notes */}
          <button
            onClick={() => handleNavigate("notes")}
            className="flex flex-col items-center gap-1"
          >
            <div className="h-[2.5px] flex items-center justify-center">
              {activeTab === "notes" && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="w-4 h-[2.5px] rounded-xs bg-[#D32F2F]"
                />
              )}
            </div>
            <DocumentIcon
              stroke={activeTab === "notes" ? "#D32F2F" : "#B8B2A9"}
              strokeWidth={activeTab === "notes" ? 1.6 : 1.5}
              style={{ flexShrink: 0 }}
            />
            <div
              className={`inline-block font-red-hat text-[10px]/3 ${
                activeTab === "notes"
                  ? "tracking-[0.2px] text-[#D32F2F] font-bold"
                  : "text-[#B8B2A9] font-medium"
              }`}
            >
              Notes
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => handleNavigate("settings")}
            className="flex flex-col items-center gap-1 min-w-12.5"
          >
            <div className="h-[2.5px] flex items-center justify-center">
              {activeTab === "settings" && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="w-4 h-[2.5px] rounded-xs bg-[#D32F2F]"
                />
              )}
            </div>
            <SettingsIcon
              stroke={activeTab === "settings" ? "#D32F2F" : "#B8B2A9"}
              strokeWidth={activeTab === "settings" ? 1.6 : 1.5}
              style={{ flexShrink: 0 }}
            />
            <div
              className={`inline-block font-red-hat text-[10px]/3 ${
                activeTab === "settings"
                  ? "tracking-[0.2px] text-[#D32F2F] font-bold"
                  : "text-[#B8B2A9] font-medium"
              }`}
            >
              Settings
            </div>
          </button>
        </motion.div>}
      </AnimatePresence>
    </div>
    </TabBarContext.Provider>
  );
}
