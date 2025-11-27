import { useState } from 'react';
import Home from './pages/Home';
import Template from './pages/Template';

type Tab = 'home' | 'template';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isDark, setIsDark] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#002a11]">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Header */}
      <header className="relative bg-transparent backdrop-blur-xl sticky top-0 z-50">
        <div className="relative px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="32" height="17" viewBox="0 0 726 387" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect y="215" width="172" height="172" fill="#36C07D"/>
              <path d="M136 0L446 215V387L136 172V0Z" fill="#36C07D"/>
              <path d="M416 0L726 215V387L416 172V0Z" fill="#36C07D"/>
            </svg>
            <span className="font-bold text-lg text-slate-100">Mentra</span>
          </div>

          {/* Tab Navigation - Desktop */}
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-2 py-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'home'
                  ? 'text-[#00e2a2] border-[#00e2a2]'
                  : 'text-emerald-400/40 hover:text-emerald-400/60 border-transparent'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`px-2 py-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'template'
                  ? 'text-[#00e2a2] border-[#00e2a2]'
                  : 'text-emerald-400/40 hover:text-emerald-400/60 border-transparent'
              }`}
            >
              Template
            </button>
          </div>

          {/* Tab Navigation - Mobile Dropdown */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#00e2a2] bg-slate-800/50 rounded-md"
            >
              {activeTab === 'home' ? 'Home' : 'Template'}
              <svg
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 border-[0.5px] border-[#00ff5e2d] bg-black rounded-md shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeTab === 'home'
                      ? 'text-[#00e2a2] bg-slate-700'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setActiveTab('template');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeTab === 'template'
                      ? 'text-[#00e2a2] bg-slate-700'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Template
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {activeTab === 'home' ? <Home /> : <Template isDark={isDark} setIsDark={setIsDark} />}
      </main>
    </div>
  );
}
