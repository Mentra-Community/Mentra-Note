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

Create a `.env` file:

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

## Architecture

### The Synced Library

This app demonstrates the `@ballah/synced` library for building real-time MentraOS apps.

#### Core Concepts

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

#### Example Manager

```typescript
class NotesManager extends SyncedManager {
  @synced notes = synced<Note[]>([]);
  @synced generating = false;

  @rpc
  async generateNote(title?: string): Promise<Note> {
    this.generating = true;
    const note = await createNoteWithAI(title);
    this.notes.mutate(n => n.push(note));
    this.generating = false;
    return note;
  }
}
```

#### Frontend Usage

```typescript
const { session } = useSynced<SessionI>(userId);

// Reactive state - updates automatically
session.notes.notes
session.notes.generating

// RPC calls - returns Promise
await session.notes.generateNote("My Note");
```

### Project Structure

```
src/
├── index.ts              # Entry point, Bun server setup
├── app/
│   └── index.ts          # NotesApp class (extends AppServer)
├── synced/
│   ├── managers.ts       # TranscriptManager, NotesManager, ChatManager, etc.
│   ├── session.ts        # NotesSession class
│   ├── types.ts          # TypeScript interfaces for frontend
│   └── useSynced.ts      # React hook for frontend
├── services/
│   ├── db/               # MongoDB models and helpers
│   └── llm/              # AI provider abstraction
├── api/
│   └── router.ts         # REST API endpoints
└── webview/
    ├── App.tsx           # Main React app
    ├── views/            # NotesView, SettingsView
    └── components/       # UI components
```

### Managers

| Manager | Purpose |
|---------|---------|
| `TranscriptSyncedManager` | Captures and persists transcription segments |
| `NotesSyncedManager` | CRUD for notes, AI generation |
| `ChatSyncedManager` | AI chat with transcript/notes context |
| `SettingsSyncedManager` | User preferences |

### Data Flow

```
Glasses → MentraOS SDK → NotesApp.onSession()
                              ↓
                        NotesSession.onTranscription()
                              ↓
                        TranscriptManager.addSegment()
                              ↓
                        @synced segments updates
                              ↓
                        WebSocket broadcast
                              ↓
                        useSynced hook updates
                              ↓
                        React re-renders
```

## API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/status` | GET | Auth status |
| `/api/transcripts/today` | GET | Get today's transcript |
| `/api/transcripts/:date` | GET | Get transcript by date |
| `/api/notes` | GET | List all notes |
| `/api/notes` | POST | Create manual note |
| `/api/notes/generate` | POST | Generate AI note |
| `/api/notes/:id` | PUT | Update note |
| `/api/notes/:id` | DELETE | Delete note |
| `/api/settings` | GET/PUT | User settings |

### WebSocket Sync

Connect to `/ws/sync?userId=<userId>` for real-time state sync.

Message types:
- `snapshot` - Full state snapshot
- `state_change` - Incremental update
- `rpc_request` - Call RPC method
- `rpc_response` - RPC result

## Development

### Adding a New Manager

1. Create the manager class in `src/synced/managers.ts`:

```typescript
export class MyManager extends SyncedManager {
  @synced myState = synced<MyType[]>([]);

  @rpc
  async myMethod(): Promise<void> {
    // Implementation
  }
}
```

2. Add to session in `src/synced/session.ts`:

```typescript
export class NotesSession extends SyncedSession {
  @manager myManager = new MyManager();
}
```

3. Add types in `src/synced/types.ts`:

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

### Testing with Mock Data

Without glasses connected, the app works in "headless" mode. You can:
1. Use the AI Chat to test AI features
2. Create manual notes
3. Use the REST API to inject test data

## Deployment

### Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
MENTRAOS_API_KEY=...
PACKAGE_NAME=com.mentra.notes
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=...
```

## License

MIT

## Contributing

This is an example app for MentraOS development. Feel free to use it as a starting point for your own apps!