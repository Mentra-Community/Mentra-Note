import { useEffect, useState } from "react";

interface Transcription {
  text: string;
  speakerId: string;
  isFinal: boolean;
  utteranceId?: string;
  startTime: number;
  endTime: number;
}

function Test() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [connected, setConnected] = useState(false);

  const userId = new URLSearchParams(window.location.search).get("userId") ?? "";

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse/transcription/${userId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        setConnected(true);
      } else if (data.type === "transcription") {
        setTranscriptions((prev) => {
          // If utteranceId exists, use it to find and update existing transcript
          if (data.utteranceId) {
            const existingIndex = prev.findIndex(
              (t) => t.utteranceId === data.utteranceId
            );

            if (existingIndex >= 0) {
              // Update existing transcript
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              // New utterance
              return [...prev, data];
            }
          } else {
            // No utteranceId: use speaker-based logic
            if (!data.isFinal) {
              // Replace any existing interim from the same speaker
              const filtered = prev.filter(
                (t) => !(t.speakerId === data.speakerId && !t.isFinal)
              );
              return [...filtered, data];
            } else {
              // Final transcript: remove interim from same speaker and add final
              const filtered = prev.filter(
                (t) => !(t.speakerId === data.speakerId && !t.isFinal)
              );
              return [...filtered, data];
            }
          }
        });
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Transcription Test</h1>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>

      <div style={{ marginTop: "20px" }}>
        {transcriptions.map((t, i) => (
          <div
            key={i}
            style={{
              padding: "8px",
              marginBottom: "4px",
              background: t.isFinal ? "#e0ffe0" : "#fff",
              borderRadius: "4px",
            }}
          >
            <strong>[{t.speakerId}]:</strong> {t.text}
            {!t.isFinal && <span style={{ color: "#999" }}> (partial)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Test;