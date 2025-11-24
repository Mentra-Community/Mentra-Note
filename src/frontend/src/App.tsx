import { useState } from 'react';
import Home from './pages/Home';
import Template from './pages/Template';

type Tab = 'home' | 'template';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isDark, setIsDark] = useState(true);

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

          {/* Tab Navigation - moved to right */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'home'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'template'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Template
            </button>
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
