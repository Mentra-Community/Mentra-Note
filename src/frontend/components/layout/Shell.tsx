/**
 * Shell - Responsive layout wrapper
 *
 * Provides:
 * - Desktop: Left sidebar with navigation
 * - Mobile: Bottom tab bar navigation with lightning button for quick actions
 *
 * Handles responsive breakpoints and connection status display.
 */

import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { clsx } from "clsx";
import { Home, Settings, Wifi, WifiOff, Zap } from "lucide-react";
import { useSynced } from "../../hooks/useSynced";
import { useMentraAuth } from "@mentra/react";
import type { SessionI } from "../../../shared/types";
import { QuickActionsDrawer } from "../shared/QuickActionsDrawer";

interface ShellProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  {
    path: "/",
    icon: Home,
    label: "Home",
    matchPaths: ["/", "/day"],
  },
  {
    path: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function Shell({ children }: ShellProps) {
  const { userId } = useMentraAuth();
  const { isConnected } = useSynced<SessionI>(userId || "");
  const [location, setLocation] = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isActive = (item: NavItem): boolean => {
    if (location === item.path) return true;
    if (item.matchPaths) {
      return item.matchPaths.some((p) => p !== "/" && location.startsWith(p));
    }
    return false;
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      {/* Desktop Sidebar */}
      <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col items-center py-4 gap-2 bg-white dark:bg-zinc-950">
        {/* App Icon */}
        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center mb-4">
          <span className="text-white dark:text-zinc-900 text-lg">📝</span>
        </div>

        {/* Nav Items */}
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isActive(item)
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900",
            )}
            title={item.label}
          >
            <item.icon size={20} />
          </button>
        ))}

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
        <main className="flex-1 overflow-hidden relative pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom z-30">
        <div className="flex items-center justify-around h-16 px-4">
          {/* Home */}
          <button
            onClick={() => setLocation("/")}
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors",
              isActive(navItems[0])
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-400",
            )}
          >
            <Home size={22} />
          </button>

          {/* Center Action Button - Lightning */}
          <button
            onClick={() => setShowQuickActions(true)}
            className="w-14 h-14 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg -mt-4 active:scale-95 transition-transform"
            title="Quick Actions"
          >
            <Zap size={24} className="text-white dark:text-zinc-900" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setLocation("/settings")}
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors",
              isActive(navItems[1])
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-400",
            )}
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Quick Actions Drawer */}
      <QuickActionsDrawer
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </div>
  );
}
