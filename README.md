# Notes App

A MentraOS app that transcribes your day and helps you generate AI-powered notes. This serves as the canonical example of how to build MentraOS apps using the `@ballah/synced` state synchronization library.

## Features

- **All-day Transcription**: Continuously captures speech via MentraOS glasses
- **AI Note Generation**: Summarize transcripts into structured notes using Gemini or Anthropic
- **Manual Notes**: Create and edit notes directly
- **AI Chat**: Ask questions about your transcripts and notes
- **Real-time Sync**: All state syncs instantly across devices via WebSocket
- **Persistent Storage**: MongoDB persistence for transcripts and notes

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- MongoDB instance (optional, for persistence)
- MentraOS API key
- AI provider API key (Gemini or Anthropic)

### Environment Setup

The app uses a symlink to SEGA's `.env` file:

```bash
# Already set up - points to ../sega/.env
ls -la .env
# .env -> ../sega/.env
```

Or create your own `.env`:

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
│   ├── App.tsx                 # Main React app
│   ├── frontend.tsx            # React entry point
│   ├── index.html              # HTML template
│   ├── views/
│   │   ├── NotesView.tsx       # Main notes view with folder list
│   │   └── SettingsView.tsx    # Settings page
│   ├── components/
│   │   ├── tabs/
│   │   │   ├── TranscriptionsTab.tsx
│   │   │   ├── NotesTab.tsx
│   │   │   └── AIChatTab.tsx
│   │   ├── notes/
│   │   │   ├── FolderList.tsx
│   │   │   └── FolderDetail.tsx
│   │   ├── shared/
│   │   └── ui/                 # Radix UI components
│   ├── hooks/
│   │   ├── useSynced.ts        # React hook for synced state
│   │   └── useSSE.ts
│   ├── lib/
│   │   ├── mockData.ts         # UI data types
│   │   └── utils.ts
│   └── assets/
└── backend/                    # All server-side code
    ├── app/
    │   └── index.ts            # NotesApp class (extends AppServer)
    ├── api/
    │   └── router.ts           # REST API endpoints
    ├── services/
    │   ├── db/
    │   │   └── index.ts        # MongoDB models and helpers
    │   └── llm/
    │       ├── index.ts        # Provider factory
    │       ├── gemini.ts
    │       ├── anthropic.ts
    │       └── types.ts
    └── synced/
        ├── managers.ts         # TranscriptManager, NotesManager, ChatManager, SettingsManager
        └── session.ts          # NotesSession class
```

---

## Architecture: The Synced Library

This app demonstrates the `@ballah/synced` library for building real-time MentraOS apps.

### Core Concepts

```typescript
// Decorators
@synced    // Mark property to sync to all connected frontends
@rpc       // Mark method as callable from frontend
@manager   // Auto-wire manager to session

// Types
Synced<T>  // Wrapper for arrays/objects with .mutate(), .set()

// Base Classes
SyncedManager   // Extend for each domain (transcript, notes, etc.)
SyncedSession   // Extend for user session, contains managers
SessionManager  // Factory that creates one session per user
```

### Example Manager

```typescript
// src/backend/synced/managers.ts
export class NotesSyncedManager extends SyncedManager {
  @synced notes = synced<Note[]>([]);
  @synced generating = false;

  @rpc
  async generateNote(title?: string): Promise<Note> {
    this.generating = true;
    
    // Get transcript from session
    const transcriptManager = (this._session as any)?.transcript;
    const segments = transcriptManager?.segments ?? [];
    const transcriptText = segments.map(s => s.text).join(" ");
    
    // Call AI to generate summary
    const provider = this.getProvider();
    const response = await provider.chat([...], { tier: "fast" });
    
    const note: Note = {
      id: `note_${Date.now()}`,
      title: title || "Generated Note",
      content: transcriptText,
      summary: response.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.notes.mutate(n => n.unshift(note));
    this.generating = false;
    
    // Persist to DB
    await this.persistNote(note);
    
    return note;
  }
}
```

### Example Session

```typescript
// src/backend/synced/session.ts
export class NotesSession extends SyncedSession {
  @manager transcript = new TranscriptSyncedManager();
  @manager notes = new NotesSyncedManager();
  @manager chat = new ChatSyncedManager();
  @manager settings = new SettingsSyncedManager();

  private _appSession: AppSession | null = null;

  setAppSession(appSession: AppSession): void {
    this._appSession = appSession;
    this.broadcastStateChange("session", "hasGlassesConnected", true);
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
// src/frontend/hooks/useSynced.ts usage
import { useSynced } from "./hooks/useSynced";
import type { SessionI } from "../shared/types";

function MyComponent() {
  const { userId } = useMentraAuth();
  const { session, isConnected } = useSynced<SessionI>(userId || "");

  // Reactive state - updates automatically
  const notes = session?.notes?.notes ?? [];
  const generating = session?.notes?.generating ?? false;

  // RPC calls - returns Promise
  const handleGenerate = async () => {
    await session?.notes?.generateNote("My Note");
  };

  return (
    <div>
      {generating && <Spinner />}
      {notes.map(note => <NoteCard key={note.id} note={note} />)}
      <button onClick={handleGenerate}>Generate Note</button>
    </div>
  );
}
```

---

## Managers

| Manager | State | RPCs |
|---------|-------|------|
| `TranscriptSyncedManager` | `segments`, `interimText`, `isRecording` | `getRecentSegments()`, `getFullText()`, `clear()` |
| `NotesSyncedManager` | `notes`, `generating` | `generateNote()`, `createManualNote()`, `updateNote()`, `deleteNote()` |
| `ChatSyncedManager` | `messages`, `isTyping` | `sendMessage()`, `clearHistory()` |
| `SettingsSyncedManager` | `showLiveTranscript`, `displayName` | `updateSettings()` |

### TranscriptSyncedManager

Handles real-time transcription from glasses:

- `addSegment(text, isFinal, speakerId)` - Called by session on transcription events
- `hydrate()` - Loads today's transcript from MongoDB on session start
- `persist()` - Batched save to DB every 30 seconds
- Interim text shown in UI but not persisted

### NotesSyncedManager

Handles notes with AI generation:

- `generateNote()` - Creates AI summary from transcript using Gemini/Anthropic
- `createManualNote()` - Creates user-written note
- `hydrate()` - Loads notes from MongoDB on session start
- All CRUD operations persist to DB

### ChatSyncedManager

AI chat with transcript/notes context:

- `sendMessage()` - Sends user message, gets AI response
- Builds context from recent transcript (last 50 segments) + recent notes (last 5)
- Uses same AI provider as note generation

---

## Data Flow

```
Glasses → MentraOS SDK → NotesApp.onSession()
                              ↓
                        NotesSession.onTranscription()
                              ↓
                        TranscriptManager.addSegment()
                              ↓
                        @synced segments updates
                              ↓
                        WebSocket broadcast to all clients
                              ↓
                        useSynced hook receives state_change
                              ↓
                        React re-renders
```

### WebSocket Protocol

Connect to `/ws/sync?userId=<userId>` for real-time state sync.

**Messages from server:**
```typescript
type WSMessageToClient =
  | { type: "connected" }
  | { type: "snapshot"; state: Record<string, any> }
  | { type: "state_change"; manager: string; property: string; value: any }
  | { type: "rpc_response"; id: string; result?: any; error?: string };
```

**Messages to server:**
```typescript
type WSMessageToServer =
  | { type: "request_snapshot" }
  | { type: "rpc_request"; id: string; manager: string; method: string; args: any[] };
```

---

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/status` | GET | Auth status |
| `/api/transcripts/today` | GET | Get today's transcript |
| `/api/transcripts/:date` | GET | Get transcript by date |
| `/api/transcripts/today` | DELETE | Clear today's transcript |
| `/api/notes` | GET | List all notes |
| `/api/notes` | POST | Create manual note |
| `/api/notes/generate` | POST | Generate AI note |
| `/api/notes/:id` | GET | Get specific note |
| `/api/notes/:id` | PUT | Update note |
| `/api/notes/:id` | DELETE | Delete note |
| `/api/settings` | GET | Get user settings |
| `/api/settings` | PUT | Update user settings |
| `/api/session/status` | GET | Get session status |

---

## Database Models

Located in `src/backend/services/db/index.ts`:

### DailyTranscript
```typescript
{
  userId: string;
  date: string;  // YYYY-MM-DD
  segments: [{
    text: string;
    timestamp: Date;
    isFinal: boolean;
    speakerId?: string;
    index: number;
  }];
  totalSegments: number;
}
```

### Note
```typescript
{
  userId: string;
  title: string;
  summary: string;
  content: string;
  keyPoints: string[];
  decisions: string[];
  detailLevel: "brief" | "standard" | "detailed";
  isStarred: boolean;
  meetingId?: string;  // Legacy, not used in Notes app
}
```

### UserSettings
```typescript
{
  userId: string;
  showLiveTranscript: boolean;
  displayName?: string;
  // Legacy fields from SEGA still in schema
}
```

---

## Development

### Adding a New Manager

1. Create the manager class in `src/backend/synced/managers.ts`:

```typescript
export class MyManager extends SyncedManager {
  @synced myState = synced<MyType[]>([]);

  @rpc
  async myMethod(): Promise<void> {
    // Implementation
  }
  
  async hydrate(): Promise<void> {
    // Load from DB
  }
}
```

2. Add to session in `src/backend/synced/session.ts`:

```typescript
export class NotesSession extends SyncedSession {
  @manager myManager = new MyManager();
}
```

3. Add types in `src/shared/types.ts`:

```typescript
export interface MyManagerI {
  myState: MyType[];
  myMethod(): Promise<void>;
}

export interface SessionI {
  myManager: MyManagerI;
  // ...
}
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/lib/sync.ts` | Core synced library - decorators, base classes |
| `src/backend/synced/managers.ts` | All manager implementations |
| `src/backend/synced/session.ts` | Session class with @manager decorators |
| `src/shared/types.ts` | TypeScript interfaces for frontend |
| `src/frontend/hooks/useSynced.ts` | React hook for consuming synced state |
| `src/backend/services/db/index.ts` | MongoDB models and helpers |
| `src/backend/services/llm/index.ts` | AI provider factory |

### Persistence Pattern

```typescript
class MyManager extends SyncedManager {
  private pendingItems: Item[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async hydrate(): Promise<void> {
    const data = await loadFromDB(this._session.userId);
    this.items.set(data);
  }

  async persist(): Promise<void> {
    if (this.pendingItems.length === 0) return;
    const toSave = [...this.pendingItems];
    this.pendingItems = [];
    await saveToDB(this._session.userId, toSave);
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      await this.persist();
    }, 30000);  // Batch every 30 seconds
  }
}
```

### Common Gotchas

1. **Proxy must be used** - `initializeManager()` returns a proxy, must assign it back
2. **Session-level state** - Properties like `hasGlassesConnected` are broadcast with `manager: "session"` but stored at top level
3. **Timezone issues** - Use local date formatting, not `toISOString().split("T")[0]`
4. **React DevTools** - Filter out `$$typeof`, `_owner`, etc. in proxy getter

---

## What's Left to Do

### Cleanup
- [ ] Rename `src/frontend/styles/sega.css` to `notes.css`
- [ ] Remove unused landing page assets in `src/frontend/assets/landing/`
- [ ] Remove unused onboarding assets in `src/frontend/assets/onboarding/`
- [ ] Clean up any remaining SEGA references in comments

### Features
- [ ] Historical transcript loading (currently only loads today)
- [ ] Search across transcripts and notes
- [ ] Export notes as markdown/PDF
- [ ] Note tagging/categorization
- [ ] Transcript speaker labeling UI

### UI Polish
- [ ] FolderList/FolderDetail still have some meeting-related code paths
- [ ] Mobile responsive improvements
- [ ] Empty states for new users
- [ ] Onboarding flow (removed, might want minimal version)

### Testing
- [ ] End-to-end test with glasses connected
- [ ] Test AI generation with both Gemini and Anthropic
- [ ] Test DB persistence across server restarts
- [ ] Test WebSocket reconnection

---

## Git History

```
93402e0 Initial Notes app - cloned from SEGA and simplified
fd5f8fd Add ChatManager, AI note generation, and DB persistence
64b3ea2 Fix TypeScript error in getNotesByDate filter
8615699 Add comprehensive README documentation
87e28d9 Symlink .env to SEGA, update env.example for Notes
ba27b8a Restructure to src/frontend, src/backend, src/shared
b9bf4ab Move lib/ to src/lib (shared infrastructure)
```

---

## Related Files in Monorepo

- `apps/sega/` - Original app this was cloned from
- `packages/sdk/` - MentraOS SDK (@mentra/sdk)
- `packages/react/` - React helpers (@mentra/react)

---

## License

MIT

## Contributing

This is an example app for MentraOS development. Feel free to use it as a starting point for your own apps!