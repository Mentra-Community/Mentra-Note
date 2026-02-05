import React from 'react';
import { Home, Zap, Settings } from 'lucide-react';
import { clsx } from 'clsx';

interface BottomNavProps {
  activeTab: 'folders' | 'settings';
  onTabChange: (tab: 'folders' | 'settings' | 'add') => void;
  onAddPress: () => void;
  onAddLongPress: () => void;
  isRecording?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  onTabChange, 
  onAddPress,
  onAddLongPress,
  isRecording 
}) => {
  return (
    <div className="h-[72px] flex items-center justify-between px-12 pb-2">
      <button 
        onClick={() => onTabChange('folders')}
        className={clsx(
          "flex flex-col items-center justify-center gap-1 transition-colors w-12 h-12 rounded-full",
          activeTab === 'folders' ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
        )}
      >
        <Home size={24} strokeWidth={activeTab === 'folders' ? 2.5 : 2} fill={activeTab === 'folders' ? "currentColor" : "none"} />
      </button>

      <button 
        onClick={onAddPress}
        className="flex flex-col items-center justify-center gap-1 group"
      >
        <div className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm",
            "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 active:scale-95"
        )}>
            <Zap size={24} strokeWidth={2} fill="currentColor" className="text-white dark:text-zinc-900" />
        </div>
      </button>

      <button 
        onClick={() => onTabChange('settings')}
        className={clsx(
          "flex flex-col items-center justify-center gap-1 transition-colors w-12 h-12 rounded-full",
          activeTab === 'settings' ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
        )}
      >
        <div className="relative">
            <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        </div>
      </button>
    </div>
  );
};
