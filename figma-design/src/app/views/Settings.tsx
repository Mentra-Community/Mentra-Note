import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Trash2, Bell, Database, Mic } from 'lucide-react';
import { clsx } from 'clsx';
import { Drawer } from 'vaul';

interface SettingsProps {
    isDarkMode?: boolean;
    onToggleTheme?: () => void;
    // Add default prop for initial section for deep linking
    initialSection?: 'main' | 'recording';
}

const SettingsRow = ({ 
    label, 
    value, 
    description,
    type = 'arrow', 
    onClick,
    active,
    icon: Icon
}: { 
    label: string; 
    value?: string; 
    description?: string;
    type?: 'arrow' | 'toggle' | 'none'; 
    onClick?: () => void;
    active?: boolean;
    icon?: React.ElementType;
}) => (
    <div 
        onClick={type === 'toggle' ? undefined : onClick} 
        className={clsx(
            "flex flex-col py-4 border-b border-zinc-100 dark:border-zinc-800 transition-colors px-6 -mx-6",
            onClick && type !== 'toggle' ? "cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50" : ""
        )}
    >
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                 {Icon && <Icon size={20} className="text-zinc-400 dark:text-zinc-500" />}
                 <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
            </div>
            
            <div className="flex items-center gap-3">
                {value && <span className="text-sm text-zinc-500">{value}</span>}
                {type === 'arrow' && <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />}
                {type === 'toggle' && (
                    <button 
                        onClick={onClick}
                        className={clsx("w-11 h-6 rounded-full p-1 relative transition-colors cursor-pointer", active ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700")}
                    >
                        <div className={clsx("w-4 h-4 rounded-full absolute shadow-sm transition-transform top-1", 
                            active ? "bg-white dark:bg-black translate-x-5" : "bg-white dark:bg-black translate-x-0"
                        )} />
                    </button>
                )}
            </div>
        </div>
        {description && (
             <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 pr-12 leading-relaxed">
                 {description}
             </p>
        )}
    </div>
);

type SettingsPage = 'main' | 'notifications' | 'storage';

export const SettingsView: React.FC<SettingsProps> = ({ isDarkMode, onToggleTheme, initialSection }) => {
  const [currentPage, setCurrentPage] = useState<SettingsPage>('main');
  const [isClearCacheOpen, setIsClearCacheOpen] = useState(false);
  const [cacheSize, setCacheSize] = useState('145 MB');
  const [persistentTranscription, setPersistentTranscription] = useState(true);

  // If initialSection is recording, we scroll to it (mocked by just rendering main page, but we could add highlighting)
  // Since "Persistent Transcription" is on the main page, we just stay there.
  
  const handleClearCache = () => {
      setCacheSize('0 MB');
      setIsClearCacheOpen(false);
  };

  const renderHeader = (title: string, onBack?: () => void) => (
      <div className="px-6 pt-[60px] pb-4 sticky top-0 bg-white dark:bg-black z-10 border-b border-zinc-100 dark:border-zinc-800 transition-colors flex items-center gap-3">
            {onBack && (
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <ChevronLeft size={24} className="text-zinc-900 dark:text-white" strokeWidth={1.5} />
                </button>
            )}
            <h1 className={clsx("text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight", !onBack && "mt-0")}>{title}</h1>
       </div>
  );

  if (currentPage === 'notifications') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-black transition-colors animate-in slide-in-from-right duration-200">
              {renderHeader("Notifications", () => setCurrentPage('main'))}
              <div className="flex-1 overflow-y-auto px-6 pb-24">
                  <div className="mt-6 mb-2">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                          Mentra Notes is designed to be quiet. We don't send push notifications for reminders or social interactions.
                      </p>
                      
                      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Alerts</h3>
                      <SettingsRow label="Transcription Ready" type="toggle" active={false} onClick={() => {}} />
                      <SettingsRow label="Daily Summary" type="toggle" active={true} onClick={() => {}} />
                  </div>
              </div>
          </div>
      );
  }

  if (currentPage === 'storage') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-black transition-colors animate-in slide-in-from-right duration-200">
              {renderHeader("Data & Storage", () => setCurrentPage('main'))}
              <div className="flex-1 overflow-y-auto px-6 pb-24">
                  
                  {/* Storage Usage Graph */}
                  <div className="mt-6 mb-8 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                      <div className="flex justify-between items-end mb-4">
                          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Used Storage</span>
                          <span className="text-2xl font-bold text-zinc-900 dark:text-white">2.4 GB</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-zinc-900 dark:bg-white w-[60%]" />
                          <div className="h-full bg-zinc-400 dark:bg-zinc-600 w-[15%]" />
                      </div>
                      <div className="flex gap-4 mt-4">
                          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                              <span>Audio</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                              <span>Transcripts</span>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-1">
                      <SettingsRow 
                        label="Clear Cache" 
                        value={cacheSize}
                        onClick={() => setIsClearCacheOpen(true)}
                        icon={Trash2}
                      />
                      <SettingsRow 
                        label="Export All Data" 
                        onClick={() => {}}
                        icon={Database}
                      />
                  </div>

                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-8 leading-relaxed">
                      Cache includes temporary transcription files and processed audio chunks. Clearing it will not delete your original recordings or notes.
                  </p>
              </div>

              {/* Clear Cache Dialog */}
              <Drawer.Root open={isClearCacheOpen} onOpenChange={setIsClearCacheOpen}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto outline-none">
                        <div className="p-6">
                            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Clear Cache?</Drawer.Title>
                            <Drawer.Description className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                                This will free up {cacheSize} of space on your device. Your notes and recordings will remain safe.
                            </Drawer.Description>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleClearCache}
                                    className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
                                >
                                    Clear Cache
                                </button>
                                <button 
                                    onClick={() => setIsClearCacheOpen(false)}
                                    className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <div className="h-6" /> 
                    </Drawer.Content>
                </Drawer.Portal>
              </Drawer.Root>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
       {renderHeader("Settings")}

       <div className="flex-1 overflow-y-auto px-6 pb-24">
           {/* General Section */}
           <div className="mt-6 mb-2">
               <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">General</h3>
               <SettingsRow label="Notifications" onClick={() => setCurrentPage('notifications')} icon={Bell} />
               <SettingsRow label="Data & Storage" onClick={() => setCurrentPage('storage')} icon={Database} />
           </div>

           {/* Recording Section */}
           <div className="mt-8 mb-2" id="recording-settings">
               <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Recording</h3>
               <SettingsRow 
                 label="Persistent transcription" 
                 type="toggle" 
                 active={persistentTranscription} 
                 onClick={() => setPersistentTranscription(!persistentTranscription)}
                 description="When enabled, Mentra Notes captures transcripts automatically while active"
               />
           </div>

           {/* Preferences Section */}
           <div className="mt-8 mb-2">
               <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Preferences</h3>
               <SettingsRow label="Dark Mode" type="toggle" active={isDarkMode} onClick={onToggleTheme} />
           </div>

           <div className="mt-12 text-center">
               <p className="text-xs text-zinc-400 dark:text-zinc-600">Mentra Notes v1.0.3</p>
           </div>
       </div>
    </div>
  );
};
