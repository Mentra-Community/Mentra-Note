# Notes App

A MentraOS app that transcribes your day and helps you generate AI-powered notes. Built with the `@ballah/synced` state synchronization library for real-time sync between glasses and webview.

## Features

- **All-day Transcription**: Continuously captures speech via MentraOS glasses
- **AI Note Generation**: Summarize transcripts into structured notes using Gemini or Anthropic
- **Hour Summaries**: AI-generated rolling summaries for each hour of your day
- **Manual Notes**: Create and edit notes directly
- **AI Chat**: Ask questions about your transcripts and notes (per-day history)
- **Real-time Sync**: All state syncs instantly across devices via WebSocket
- **Persistent Storage**: MongoDB persistence for transcripts, notes, and chat history

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- MongoDB instance (optional, for persistence)
- MentraOS API key
- AI provider API key (Gemini or Anthropic)

### Environment Setup

Copy the example env file:

```bash
cp env.example .env
```

Then edit `.env`:

```bash
# Required
MENTRAOS_API_KEY=your_mentra_api_key
PACKAGE_NAME=com.mentra.notes

# Optional - AI Provider (at least one recommended)
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional - Database
MONGODB_URI=mongodb://localhost:27017

# Optional
PORT=3000
NODE_ENV=development
```

### Running the App

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Or start production server
bun run start
```

The app will be available at `http://localhost:3000`.

---

## Project Structure

```
src/
├── index.ts                    # Entry point, Bun server setup
├── lib/                        # Shared infrastructure
│   ├── sync.ts                 # Core @ballah/synced library
│   └── synced.ts               # Additional sync utilities
├── shared/                     # Types shared between frontend & backend
│   └── types.ts                # SessionI, Note, ChatMessage, etc.
├── frontend/                   # All React/webview code
│   ├── App.tsx                 # Main React app with theme context
│   ├── router.tsx              # Wouter route definitions
│   ├── frontend.tsx            # React entry point
│   ├── index.html              # HTML template
│   ├── pages/                  # Page-based routing
│   │   ├── home/
│   │   │   ├── HomePage.tsx    # Main folder list view
│   │   │   └── components/
│   │   ├── day/
│   │   │   ├── DayPage.tsx     # Day detail with tabs
│   │   │   └── components/
│   │   │       ├── NoteCard.tsx
│   │   │       └── tabs/
│   │   │           ├── NotesTab.tsx
│   │   │           ├── TranscriptTab.tsx
│   │   │           ├── AudioTab.tsx
│   │   │           └── AITab.tsx
│   │   ├── note/
│   │   │   └── NotePage.tsx    # Individual note view/editor
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   ├── components/             # Shared components across pages
│   │   ├── layout/
│   │   │   └── Shell.tsx       # Responsive layout (sidebar + bottom nav)
│   │   ├── shared/             # Reusable components
│   │   └── ui/                 # Radix UI primitives
│   ├── hooks/
│   │   ├── useSynced.ts        # React hook for synced state
│   │   └── useSSE.ts
│   └── lib/
│       ├── mockData.ts         # UI data types
│       └── utils.ts
└── backend/                    # All server-side code
    ├── NotesApp.ts             # Main app class (extends AppServer)
    ├── api/
    │   └── router.ts           # REST API endpoints
    ├── models/                 # Mongoose models
    │   ├── index.ts            # Re-exports all models
    │   ├── daily-transcript.model.ts
    │   ├── hour-summary.model.ts
    │   ├── note.model.ts
    │   ├── user-settings.model.ts
    │   └── chat-history.model.ts
    ├── services/
    │   ├── db.ts               # MongoDB connection management
    │   └── llm/
    │       ├── index.ts        # Provider factory
    │       ├── gemini.ts
    │       ├── anthropic.ts
    │       └── types.ts
    └── session/
        ├── index.ts            # Re-exports session + managers
        ├── NotesSession.ts     # Session class
        └── managers/
            ├── index.ts
            ├── TranscriptManager.ts
            ├── NotesManager.ts
            ├── ChatManager.ts
            └── SettingsManager.ts
```

---

## Architecture: The Synced Library

This app demonstrates the `@ballah/synced` library for building real-time MentraOS apps.

### Core Concepts

1. **Managers** - Classes that own synced state and business logic
2. **Sessions** - Container for all managers for a user
3. **@synced decorator** - Marks properties that sync to frontend
4. **@rpc decorator** - Marks methods callable from frontend

### Example Manager

```typescript
export class NotesManager extends SyncedManager {
  @synced notes = synced<NoteData[]>([]);
  @synced generating = false;

  @rpc
  async generateNote(title?: string): Promise<NoteData> {
    this.generating = true;
    try {
      const transcriptManager = (this._session as any)?.transcript;
      const segments = transcriptManager?.segments ?? [];
      const transcriptText = segments.map((s) => s.text).join(" ");

      const provider = this.getProvider();
      const response = await provider.chat([...], { tier: "fast" });

      const note: NoteData = {
        id: `note_${Date.now()}`,
        title: title || "Generated Note",
        content: transcriptText,
        summary: response.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.notes.mutate((n) => n.unshift(note));
      return note;
    } finally {
      this.generating = false;
    }
  }
}
```

### Example Session

```typescript
export class NotesSession extends SyncedSession {
  @manager transcript = new TranscriptManager();
  @manager notes = new NotesManager();
  @manager chat = new ChatManager();
  @manager settings = new SettingsManager();

  private _appSession: AppSession | null = null;

  setAppSession(appSession: AppSession): void {
    this._appSession = appSession;
  }

  onTranscription(text: string, isFinal: boolean, speakerId?: string): void {
    this.transcript.addSegment(text, isFinal, speakerId);
  }
}

export const sessions = new SessionManager<NotesSession>(
  (userId) => new NotesSession(userId)
);
```

### Frontend Usage

```typescript
function MyComponent() {
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  // State auto-syncs from backend
  const notes = session?.notes?.notes ?? [];
  const generating = session?.notes?.generating ?? false;

  // RPCs are just async function calls
  const handleGenerate = async () => {
    await session?.notes?.generateNote("My Note");
  };

  return (
    <div>
      {notes.map((note) => (
        <div key={note.id}>{note.title}</div>
      ))}
      <button onClick={handleGenerate} disabled={generating}>
        {generating ? "Generating..." : "Generate Note"}
      </button>
    </div>
  );
}
```

---

## Managers

### TranscriptManager

Handles speech transcription from glasses.

- **State**: `segments`, `interimText`, `isRecording`, `hourSummaries`, `loadedDate`, `availableDates`
- **RPCs**: `getRecentSegments()`, `getFullText()`, `clear()`, `generateHourSummary()`, `loadDateTranscript()`, `loadTodayTranscript()`

### NotesManager

Manages user notes (manual and AI-generated).

- **State**: `notes`, `generating`
- **RPCs**: `generateNote()`, `createManualNote()`, `updateNote()`, `deleteNote()`, `getNoteById()`, `getAllNotes()`

### ChatManager

AI chat with per-day history.

- **State**: `messages`, `isTyping`, `loadedDate`
- **RPCs**: `sendMessage()`, `clearHistory()`, `loadDateChat()`

### SettingsManager

User preferences.

- **State**: `showLiveTranscript`, `displayName`, `timezone`, `glassesDisplayMode`
- **RPCs**: `updateSettings()`, `getSettings()`

---

## Data Flow

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Webview   │ ◄────────────────► │   Backend    │
│   (React)   │                    │  (Managers)  │
└─────────────┘                    └──────────────┘
       │                                  │
       │ useSynced()                      │ @synced
       │                                  │
       ▼                                  ▼
  Read synced state              State changes sync
  Call RPCs                      to all connected clients
```

### WebSocket Protocol

**Server → Client:**
```typescript
type WSMessageToClient =
  | { type: "connected" }
  | { type: "snapshot"; state: Record<string, any> }
  | { type: "state_change"; manager: string; property: string; value: any }
  | { type: "rpc_response"; id: string; result?: any; error?: string };
```

**Client → Server:**
```typescript
type WSMessageToServer =
  | { type: "request_snapshot" }
  | { type: "rpc_request"; id: string; manager: string; method: string; args: any[] };
```

---

## REST API

Available at `/api/*`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/status` | Check auth status |
| GET | `/api/transcripts/today` | Get today's transcript |
| GET | `/api/transcripts/:date` | Get transcript for date |
| DELETE | `/api/transcripts/today` | Clear today's transcript |
| GET | `/api/notes` | Get all notes |
| GET | `/api/notes/:id` | Get a note |
| POST | `/api/notes` | Create manual note |
| POST | `/api/notes/generate` | Generate note from transcript |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |
| GET | `/api/session/status` | Get session status |

---

## Database Models

Located in `src/backend/models/`:

### DailyTranscript (`daily-transcript.model.ts`)
```typescript
interface DailyTranscriptI {
  userId: string;
  date: string;  // YYYY-MM-DD
  segments: TranscriptSegmentI[];
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TranscriptSegmentI {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  speakerId?: string;
  index: number;
}
```

### HourSummary (`hour-summary.model.ts`)
```typescript
interface HourSummaryI {
  userId: string;
  date: string;
  hour: number;       // 0-23
  hourLabel: string;  // "9 AM", "2 PM"
  summary: string;
  segmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Note (`note.model.ts`)
```typescript
interface NoteI {
  userId: string;
  title: string;
  summary: string;
  content: string;
  isStarred: boolean;
  transcriptRange?: {
    startTime: Date;
    endTime: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### ChatHistory (`chat-history.model.ts`)
```typescript
interface ChatHistoryI {
  userId: string;
  date: string;  // YYYY-MM-DD
  messages: ChatMessageI[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessageI {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
```

### UserSettings (`user-settings.model.ts`)
```typescript
interface UserSettingsI {
  userId: string;
  showTranscriptOnGlasses: boolean;
  showLiveTranscript: boolean;
  glassesDisplayMode: "off" | "live_transcript" | "hour_summary" | "key_points";
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Development

### Adding a New Manager

1. Create the manager in `src/backend/session/managers/`:

```typescript
// src/backend/session/managers/MyManager.ts
import { SyncedManager, synced, rpc } from "../../../lib/sync";

export class MyManager extends SyncedManager {
  @synced myState = synced<MyType[]>([]);

  @rpc
  async myMethod(): Promise<void> {
    // Implementation
  }

  async hydrate(): Promise<void> {
    // Load initial state from DB
  }
}
```

2. Export from `src/backend/session/managers/index.ts`:

```typescript
export { MyManager } from "./MyManager";
```

3. Add to session in `src/backend/session/NotesSession.ts`:

```typescript
@manager myManager = new MyManager();
```

4. Add types in `src/shared/types.ts`:

```typescript
export interface MyManagerI {
  myState: MyType[];
  myMethod(): Promise<void>;
}

export interface SessionI {
  // ... existing managers
  myManager: MyManagerI;
}
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.ts` | App entry point, WebSocket setup |
| `src/backend/NotesApp.ts` | Main app class |
| `src/backend/session/NotesSession.ts` | User session with all managers |
| `src/backend/session/managers/` | Business logic managers |
| `src/backend/models/` | Mongoose schemas |
| `src/frontend/hooks/useSynced.ts` | React hook for synced state |
| `src/shared/types.ts` | Shared type definitions |

### Persistence Pattern

Managers should batch writes to avoid excessive DB calls:

```typescript
export class MyManager extends SyncedManager {
  private pendingItems: Item[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async hydrate(): Promise<void> {
    const data = await loadFromDB(this._session?.userId);
    this.myState.set(data);
  }

  async persist(): Promise<void> {
    if (this.pendingItems.length === 0) return;
    const toSave = [...this.pendingItems];
    this.pendingItems = [];
    await saveToDB(toSave);
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      await this.persist();
    }, 30000); // 30 second debounce
  }
}
```

### Common Gotchas

1. **Mutating arrays**: Use `this.myArray.mutate(arr => arr.push(item))` not `this.myArray.push()`
2. **Date serialization**: Dates come as strings over WebSocket, parse them on frontend
3. **Session access**: Use `this._session?.userId` to get user ID in managers
4. **RPC errors**: Wrap in try/catch, errors are sent back to client

---

## What's Left to Do

### In Progress

- Transcript Tab sticky hour headers
- Rich text note editor (TipTap)
- Quick Actions FAB redesign

### Backlog

- Audio recordings (store/playback)
- Search across transcripts and notes
- Export notes to markdown/PDF
- Share notes functionality
- Offline support

---

## Repository

This app is part of the Mentra Community:
- **GitHub**: https://github.com/Mentra-Community/Mentra-Note

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.