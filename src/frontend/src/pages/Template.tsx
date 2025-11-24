import { useState, useEffect, useCallback } from 'react';
import { Camera, Play, Mic, Image, Zap, Terminal, Moon, Sun } from 'lucide-react';

interface Photo {
  id: number;
  url: string;
  timestamp: string;
}

interface Transcription {
  id: number;
  text: string;
  time: string;
}

interface Log {
  id: number;
  message: string;
  time: string;
}

interface TemplateProps {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}

export default function Template({ isDark, setIsDark }: TemplateProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [
      { id: Date.now(), message, time: new Date().toLocaleTimeString() },
      ...prev
    ].slice(0, 20));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newPhoto = {
          id: Date.now(),
          url: `https://picsum.photos/seed/${Date.now()}/400/300`,
          timestamp: new Date().toLocaleTimeString()
        };
        setPhotos(prev => [newPhoto, ...prev].slice(0, 6));
        addLog(`Photo captured at ${newPhoto.timestamp}`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [addLog]);

  useEffect(() => {
    const phrases = [
      "Initializing audio stream...",
      "User: Hello, how are you?",
      "System: Processing speech input...",
      "Detected: Background noise filtered",
      "User: Can you hear me clearly?"
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const text = phrases[Math.floor(Math.random() * phrases.length)];
        setTranscriptions(prev => [
          { id: Date.now(), text, time: new Date().toLocaleTimeString() },
          ...prev
        ].slice(0, 10));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
    addLog(`Audio ${!isPlayingAudio ? 'started' : 'stopped'}`);
  };

  const handleSpeak = () => {
    setIsSpeaking(!isSpeaking);
    addLog(`Speech ${!isSpeaking ? 'activated' : 'deactivated'}`);
  };

  return (
    <div className="relative p-6 space-y-6 max-w-7xl mx-auto">
      {/* Photos Section */}
      <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
        <div className="relative p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#d8d8d8]">Photo Stream</h2>
              <p className="text-[10px] text-slate-400">Live captures</p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-purple-500/20">
            <span className="text-xs font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {photos.length} captured
            </span>
          </div>
        </div>

        <div className="relative p-4">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-3">
                <Image className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
              <p className="text-slate-400 text-sm">Waiting for photo captures...</p>
              <p className="text-xs text-slate-500 mt-1">Images will appear here in real-time</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="group relative aspect-video rounded-lg overflow-hidden hover:scale-105 transition-all"
                  style={{ animation: 'photoAppear 0.5s ease-out' }}
                >
                  <img
                    src={photo.url}
                    alt={`Captured at ${photo.timestamp}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] text-white font-mono">{photo.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePlayAudio}
          className={`flex-1 min-w-[150px] p-4 rounded-xl font-medium transition-all ${
            isPlayingAudio
              ? 'bg-gradient-to-br from-emerald-600 to-green-700'
              : 'bg-slate-900/50 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-white' : 'text-emerald-400'}`} />
            <span className={isPlayingAudio ? 'text-white text-sm' : 'text-slate-100 text-sm'}>
              {isPlayingAudio ? 'Stop Audio' : 'Play Audio'}
            </span>
          </div>
        </button>

        <button
          onClick={handleSpeak}
          className={`flex-1 min-w-[150px] p-4 rounded-xl font-medium transition-all ${
            isSpeaking
              ? 'bg-gradient-to-br from-rose-600 to-pink-700'
              : 'bg-slate-900/50 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Mic className={`w-4 h-4 ${isSpeaking ? 'animate-pulse text-white' : 'text-rose-400'}`} />
            <span className={isSpeaking ? 'text-white text-sm' : 'text-slate-100 text-sm'}>
              {isSpeaking ? 'Stop Speaking' : 'Speak'}
            </span>
          </div>
        </button>

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            {isDark ? <Sun className="w-4 h-4 text-purple-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
            <span className="text-slate-100 text-sm">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
        </button>
      </div>

      {/* Transcriptions and Logs */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Live Transcriptions */}
        <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
          <div className="relative p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-[#d8d8d8]">Live Transcriptions</h2>
                <p className="text-[10px] text-slate-400">Real-time audio processing</p>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 h-80 overflow-y-auto custom-scrollbar">
            {transcriptions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-center text-sm">
                  Listening for audio input...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transcriptions.map(trans => (
                  <div
                    key={trans.id}
                    className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-all"
                    style={{ animation: 'slideDown 0.3s ease-out' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] text-emerald-400 font-mono">{trans.time}</span>
                    </div>
                    <p className="text-xs text-slate-200">{trans.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Live Logs */}
        <section className="relative rounded-xl bg-slate-900/30 backdrop-blur-xl overflow-hidden">
          <div className="relative p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-[#d8d8d8]">System Logs</h2>
                <p className="text-[10px] text-slate-400">Development console</p>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 h-80 overflow-y-auto font-mono text-[11px] custom-scrollbar">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">No system logs yet...</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="text-slate-300 hover:bg-slate-800/30 px-2 py-1 rounded transition-colors"
                    style={{ animation: 'slideDown 0.2s ease-out' }}
                  >
                    <span className="text-purple-400">[{log.time}]</span>{' '}
                    <span className="text-cyan-400">→</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes photoAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
