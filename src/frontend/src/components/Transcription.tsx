import { useEffect, useState, useRef } from 'react';
import { useMentraAuth } from '@mentra/react';

interface TranscriptionEvent {
  type: 'connected' | 'transcription';
  text?: string;
  speakerId?: string;
  isFinal?: boolean;
  utteranceId?: string;
  startTime?: number;
  endTime?: number;
  userId?: string;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  speakerId?: string;
  isFinal: boolean;
  timestamp: number;
}

function Transcription() {
  const { userId } = useMentraAuth();
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPartial, setCurrentPartial] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/sse/transcription/${encodeURIComponent(userId)}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data: TranscriptionEvent = JSON.parse(event.data);
      console.log('Transcription event:', data);

      if (data.type === 'connected') {
        setIsConnected(true);
        console.log('Connected to transcription stream');
      } else if (data.type === 'transcription') {
        console.log('Transcription:', data.text, 'isFinal:', data.isFinal);
        if (data.isFinal && data.text) {
          // Add final segment to the list
          setSegments(prev => [
            ...prev,
            {
              id: data.utteranceId || `${Date.now()}`,
              text: data.text!,
              speakerId: data.speakerId,
              isFinal: true,
              timestamp: data.endTime || Date.now(),
            }
          ]);
          setCurrentPartial('');
        } else if (data.text) {
          // Show partial transcription
          setCurrentPartial(data.text);
        }
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error('SSE connection error');
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [userId]);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments, currentPartial]);

  if (!userId) {
    return (
      <div className="p-4 text-gray-500">
        Please log in to view transcriptions
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        {isConnected ? 'Live' : 'Disconnected'}
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-4"
      >
        {segments.length === 0 && !currentPartial ? (
          <div className="text-gray-400 text-center py-8">
            Waiting for transcription...
          </div>
        ) : (
          <div className="space-y-3">
            {segments.map((segment) => (
              <div key={segment.id} className="text-[15px]">
                {segment.speakerId && (
                  <span className="text-gray-400 text-xs mr-2">
                    Speaker {segment.speakerId}
                  </span>
                )}
                <span>{segment.text}</span>
              </div>
            ))}
            {currentPartial && (
              <div className="text-[15px] text-gray-400 italic">
                {currentPartial}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Transcription;
