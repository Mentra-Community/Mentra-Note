import React, { useState, useEffect } from 'react';
import { BottomNav } from '@/app/components/BottomNav';
import { FolderList } from '@/app/views/FolderList';
import { FolderDetail } from '@/app/views/FolderDetail';
import { SettingsView } from '@/app/views/Settings';
import { GlobalAIChat } from '@/app/views/GlobalAIChat';
import { mockFolders, DailyFolder } from '@/app/lib/mockData';
import { Drawer } from 'vaul';
import { Mic, FileText, Sparkles, Folder as FolderIcon, X, List, Settings, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { addHours, startOfHour } from 'date-fns';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState<'folders' | 'settings'>('folders');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<DailyFolder[]>(mockFolders);
  const [isRecording, setIsRecording] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  
  // Key to force reset FolderList state (filters, scroll)
  const [folderViewKey, setFolderViewKey] = useState(0);
  
  // New state for handling direct navigation to a note
  const [initialActiveTabInDetail, setInitialActiveTabInDetail] = useState<'transcription' | 'notes' | 'audio' | 'ai'>('transcription');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync theme with body/html class for Portals
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toggle Theme Function
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleFolderClick = (id: string) => {
    setSelectedFolderId(id);
    // Find the folder to check if it has any notes (Manual or AI)
    const folder = folders.find(f => f.id === id);
    const hasNotes = (folder?.notes.length || 0) > 0;
    
    // If there are ANY notes, go to Notes tab. Otherwise default to Transcription.
    setInitialActiveTabInDetail(hasNotes ? 'notes' : 'transcription');
  };

  const handleNoteClick = (folderId: string, noteId: string) => {
      setSelectedFolderId(folderId);
      setInitialActiveTabInDetail('notes'); 
  };

  const handleDeleteFolder = (id: string) => {
    // Permanent delete
    if (confirm('Permanently delete this folder? This cannot be undone.')) {
        setFolders(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleTrashFolder = (id: string) => {
      setFolders(prev => prev.map(f => {
          if (f.id === id) {
              const newTrashedState = !f.isTrashed;
              return { 
                  ...f, 
                  isTrashed: newTrashedState,
                  isStarred: newTrashedState ? false : f.isStarred,
                  isArchived: newTrashedState ? false : f.isArchived
              };
          }
          return f;
      }));
      if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleArchiveFolder = (id: string) => {
      setFolders(prev => prev.map(f => {
          if (f.id === id) {
             const newArchivedState = !f.isArchived;
             return {
                 ...f,
                 isArchived: newArchivedState,
                 // If archiving, ensure not trashed
                 isTrashed: false
             };
          }
          return f;
      }));
      if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleToggleStar = (id: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
  };

  const handleAddPress = () => {
      // Changed: Simply open the quick action drawer, no longer toggles recording
      setIsQuickActionOpen(true);
  };

  const handleAddLongPress = () => {
      setIsQuickActionOpen(true);
  };
  
  const handleOpenRecordingSettings = () => {
      setSelectedFolderId(null);
      setActiveTab('settings');
  };

  const handleUpdateFolder = (updatedFolder: DailyFolder) => {
      setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
      // Also update selected folder if it's the one open to ensure sync
      if (selectedFolderId === updatedFolder.id) {
          // No need to set selectedFolderId, just let the re-render handle passing new prop
      }
  };
  
  const handleExit = () => {
      toast("Closing Mentra Notes...", {
          description: "Returning to launcher"
      });
  };
  
  const handleMiniAppMenu = () => {
      toast("Mini-App Menu", {
          description: "Options: About, Pin to Home, Share"
      });
  };

  const activeFolder = folders.find(f => f.id === selectedFolderId);

  // Updated Quick Actions for MVP
  const quickActions = [
      { 
          icon: FileText, 
          label: 'Add Note', 
          onClick: () => { 
              setIsQuickActionOpen(false); 
              // Navigate to Today's folder and open notes tab
              if(folders[0]) {
                  setSelectedFolderId(folders[0].id);
                  setInitialActiveTabInDetail('notes');
              }
          } 
      },
      { 
          icon: Sparkles, 
          label: 'Generate note from current hour', 
          onClick: () => { 
              setIsQuickActionOpen(false); 
              // This would ideally trigger generation. For MVP, we can open the folder
              // and maybe show a toast or auto-trigger. 
              // Let's just go to the folder for now.
              if(folders[0]) {
                  setSelectedFolderId(folders[0].id);
                  setInitialActiveTabInDetail('notes');
                  // In a real implementation, we'd pass a "triggerGeneration" flag
              }
          } 
      }
  ];

  return (
    <div className={clsx("flex justify-center min-h-screen font-sans selection:bg-zinc-200 dark:selection:bg-zinc-700", theme)}>
      <div className="w-full h-full bg-zinc-100 dark:bg-black fixed inset-0 -z-10" />
      
      {/* Toast Notifications */}
      <Toaster position="top-center" theme={theme} />

      {/* Mobile Frame / Container */}
      <div className="w-full max-w-[480px] bg-white dark:bg-black h-screen shadow-2xl overflow-hidden relative flex flex-col sm:h-[850px] sm:rounded-2xl sm:my-8 sm:border sm:border-zinc-200 dark:sm:border-zinc-800">
        
        {/* Global Branding - Mentra Notes (Visible on all pages) */}
        <div className="absolute top-5 left-6 z-50 pointer-events-none">
             <span className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight pointer-events-auto drop-shadow-sm">Mentra Notes</span>
        </div>

        {/* Exit / Mini-App Capsule Control */}
        {/* Replicating the WeChat/Alipay Mini Program capsule style */}
        <div className="absolute top-4 right-4 z-50">
             <div className="flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm h-8">
                 {/* More Options Button (Mock) */}
                 <button 
                    onClick={handleMiniAppMenu}
                    className="h-full w-10 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-l-full transition-colors"
                 >
                     <MoreHorizontal size={18} strokeWidth={2} />
                 </button>
                 
                 {/* Divider */}
                 <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-700" />
                 
                 {/* Close/Exit Button */}
                 <button 
                    onClick={handleExit}
                    className="h-full w-10 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-r-full transition-colors"
                 >
                     {/* Using a simpler circle-within-circle icon or just X to look like "Exit" */}
                     <div className="relative w-4 h-4 flex items-center justify-center">
                        <div className="absolute inset-0 border-[1.5px] border-current rounded-full opacity-30"></div>
                        <X size={10} strokeWidth={2.5} />
                     </div>
                 </button>
             </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-white dark:bg-black">
          {showGlobalChat ? (
             <div className="absolute inset-0 z-30 bg-white dark:bg-black animate-in slide-in-from-right duration-300">
                <GlobalAIChat onBack={() => setShowGlobalChat(false)} />
             </div>
          ) : selectedFolderId && activeFolder ? (
              <div className="absolute inset-0 z-20 bg-white dark:bg-black animate-in slide-in-from-right duration-300">
                  <FolderDetail 
                      folder={activeFolder} 
                      onBack={() => setSelectedFolderId(null)}
                      onToggleStar={() => handleToggleStar(activeFolder.id)}
                      initialTab={initialActiveTabInDetail}
                      onArchive={handleArchiveFolder}
                      onTrash={handleTrashFolder}
                      onOpenRecordingSettings={handleOpenRecordingSettings}
                      onUpdateFolder={handleUpdateFolder}
                  />
              </div>
          ) : (
               <>
                  {activeTab === 'folders' && (
                      <FolderList 
                          key={folderViewKey}
                          folders={folders} 
                          onFolderClick={handleFolderClick}
                          onNoteClick={handleNoteClick}
                          onDeleteFolder={handleDeleteFolder}
                          onToggleStar={handleToggleStar}
                          onGlobalChat={() => setShowGlobalChat(true)}
                      />
                  )}
                  {activeTab === 'settings' && (
                      <SettingsView 
                          isDarkMode={theme === 'dark'} 
                          onToggleTheme={toggleTheme} 
                      />
                  )}
               </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="z-30 bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-800 pb-safe">
            <BottomNav
                activeTab={activeTab as any}
                onTabChange={(tab) => {
                    if (tab === 'add') return;
                    
                    if (tab === 'folders' && activeTab === 'folders') {
                        // If clicking folders tab while active
                        if (selectedFolderId) {
                            // Close detail view
                            setSelectedFolderId(null);
                        } else {
                            // Reset filters/scroll if already on list
                            setFolderViewKey(prev => prev + 1);
                        }
                    } else {
                        // Switch tab
                        setActiveTab(tab);
                        setSelectedFolderId(null);
                    }
                }}
                onAddPress={handleAddPress}
                onAddLongPress={handleAddLongPress}
                isRecording={isRecording}
            />
        </div>

        {/* Recording Indicator */}
        {isRecording && (
            <div className="absolute top-0 left-0 right-0 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 z-50 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono text-sm font-medium">00:04</span>
                </div>
                <button 
                    onClick={() => setIsRecording(false)} 
                    className="text-xs font-medium hover:text-zinc-300 dark:hover:text-zinc-600 transition-colors"
                >
                    Stop Recording
                </button>
            </div>
        )}

        {/* Drawer for Quick Actions */}
        <Drawer.Root open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
            <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto outline-none border-t border-zinc-100 dark:border-zinc-800">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <Drawer.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</Drawer.Title>
                  <Drawer.Description className="sr-only">Select an action to perform</Drawer.Description>
                  <button onClick={() => setIsQuickActionOpen(false)} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <X size={20} className="text-zinc-400 dark:text-zinc-500" />
                  </button>
              </div>
              <div className="p-2 bg-white dark:bg-zinc-900">
                    {quickActions.map((action) => (
                        <button 
                          key={action.label} 
                          onClick={action.onClick}
                          className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                                <action.icon size={20} strokeWidth={1.5} />
                            </div>
                            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{action.label}</span>
                        </button>
                    ))}
              </div>
              <div className="h-6 bg-white dark:bg-zinc-900" /> 
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </div>
  );
}
