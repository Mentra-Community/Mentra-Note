import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router';
import { useMentraAuth } from '@mentra/react';
import BottomNavigation from './components/BottomNavigation';
import Files from './pages/Files';
import Action from './pages/Action';
import Settings from './pages/Settings';
import Test from './pages/Test';
import InFile from './pages/InFile';

export default function App() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();
  const [isDark, setIsDark] = useState(true);

  // Log authentication state to console
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔐 [Mentra Auth] Authentication State Update');
    console.log('═══════════════════════════════════════════════════');
    console.log('👤 User ID:', userId || 'Not authenticated');
    console.log('🔄 Loading:', isLoading);
    console.log('✅ Authenticated:', isAuthenticated);
    console.log('❌ Error:', error || 'None');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════');

    if (isAuthenticated && userId) {
      console.log('✨ User successfully authenticated with ID:', userId);
    }
  }, [userId, isLoading, error, isAuthenticated]);

  // Load theme preference from backend when user authenticates
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('🎨 [Theme] Loading theme preference for user:', userId);

      fetch(`/api/theme-preference?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.theme) {
            console.log('🎨 [Theme] Loaded theme preference:', data.theme);
            setIsDark(data.theme === 'dark');
          }
        })
        .catch(error => {
          console.error('🎨 [Theme] Failed to load theme preference:', error);
          // Keep default theme on error
        });
    }
  }, [isAuthenticated, userId]);

  // Handle theme change and save to backend
  const handleThemeChange = async (newIsDark: boolean) => {
    // Update UI immediately for responsive feel
    setIsDark(newIsDark);

    // Save to backend if user is authenticated
    if (userId) {
      const theme = newIsDark ? 'dark' : 'light';
      console.log(`🎨 [Theme] Saving theme preference for user ${userId}:`, theme);

      try {
        const response = await fetch('/api/theme-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, theme })
        });

        const data = await response.json();

        if (data.success) {
          console.log('🎨 [Theme] Theme preference saved successfully:', theme);
        } else {
          console.error('🎨 [Theme] Failed to save theme preference:', data);
        }
      } catch (error) {
        console.error('🎨 [Theme] Error saving theme preference:', error);
        // Continue using the theme locally even if save fails
      }
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-gray-400">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-8">
          <h2 className="text-red-500 text-2xl font-semibold mb-4">Authentication Error</h2>
          <p className="text-red-400 font-medium mb-2">{error}</p>
          <p className="text-gray-400 text-sm">
            Please ensure you are opening this page from the MentraOS app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white ${isDark ? 'dark' : 'light'}`}>
      <Routes>
        <Route path="/" element={<Files />} />
        <Route path="/file/:fileName" element={<InFile />} />
        <Route path="/action" element={<Action />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/test" element={<Test />} />
      </Routes>
      <BottomNavigation />
    </div>
  );
}
