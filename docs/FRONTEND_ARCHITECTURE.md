# SEGA Frontend Architecture

## Overview

The SEGA frontend is a production-ready React application built for the Mentra smart glasses platform. It provides real-time meeting transcription, AI-powered note generation, action item tracking, and intelligent research capabilities.

**Status**: ✅ Complete and ready for backend API integration

---

## Architecture Layers

### 1. API Client Layer (`src/webview/api/client.ts`)

Type-safe REST API client providing all endpoints defined in the product specification.

**Key Features**:
- Singleton instance pattern
- TypeScript types for all data models
- Automatic error handling
- Cookie-based authentication support

**Implemented Endpoints**:

#### Transcript Management
- `GET /api/transcript/today` - Get today's transcription
- `GET /api/transcript/:date` - Get transcription by date
- `GET /api/transcript/:date/range?start=X&end=Y` - Get transcript range

#### Meeting Management
- `GET /api/meetings` - List meetings with filters
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings/:id/end` - End active meeting
- `POST /api/meetings/:id/process` - Process meeting for notes

#### Notes Management
- `GET /api/notes` - List notes with date filter
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create manual note
- `PUT /api/notes/:id` - Update note
- `POST /api/notes/:id/generate-summary` - Regenerate note summary
- `POST /api/notes/:id/email` - Email note to recipient

#### Action Items
- `GET /api/actions` - List action items with filters
- `GET /api/actions/:id` - Get specific action item
- `POST /api/actions` - Create action item
- `PUT /api/actions/:id` - Update action item
- `DELETE /api/actions/:id` - Delete action item

#### Research
- `POST /api/research` - Start research query
- `GET /api/research/:id` - Get research results
- `GET /api/research/meeting/:meetingId` - Get research for meeting
- `POST /api/research/:id/email` - Email research results

#### Settings & Presets
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `GET /api/presets` - List all presets
- `GET /api/presets?active=true` - List active presets
- `GET /api/presets/:id` - Get specific preset
- `POST /api/presets` - Create preset
- `PUT /api/presets/:id` - Update preset
- `DELETE /api/presets/:id` - Delete preset

#### Sensitive Topics
- `GET /api/sensitive-topics` - List sensitive topics
- `POST /api/sensitive-topics` - Add sensitive topic
- `DELETE /api/sensitive-topics/:id` - Remove sensitive topic

#### Application State
- `GET /api/state` - Get current app state
- `POST /api/state/recording/start` - Start recording
- `POST /api/state/recording/stop` - Stop recording
- `POST /api/state/glasses/transcript` - Toggle glasses transcript display

#### Health & Info
- `GET /api/health` - Health check
- `GET /api/me` - Get authenticated user info

**Usage Example**:
```typescript
import { api } from '@/api/client';

// Fetch notes
const notes = await api.getNotes({ date: '2026-01-31' });

// Create action item
const action = await api.createActionItem({
  task: 'Follow up on proposal',
  priority: 'high',
  owner: 'John Doe',
  dueDate: new Date('2026-02-05'),
  status: 'todo'
});

// Update action status
await api.updateActionItem(action.id, { status: 'in_progress' });
```

---

### 2. Real-Time Events Layer (`src/webview/hooks/useSSE.ts`)

Server-Sent Events (SSE) hook for real-time backend communication.

**Key Features**:
- Automatic reconnection with exponential backoff
- Typed event interfaces for all backend events
- Event filtering and querying
- Memory-efficient event buffering (max 100 events)

**Supported Events**:

#### Transcription Events
**`transcript`**
```typescript
{
  type: 'transcript';
  text: string;              // Speech text
  speakerHint?: string;      // Speaker identification hint
  speakerLabel?: string;     // Labeled speaker
  isFinal: boolean;          // Whether transcription is final
  timestamp: number;         // Event timestamp
}
```

#### Session State Events
**`state_update`**
```typescript
{
  type: 'state_update';
  status: 'idle' | 'meeting_active' | 'meeting_ended' | 'processing';
  activeMeetingId?: string;
  lastAnalysisAt?: string;
  detectedSensitiveTopics?: string[];
  effectiveAutonomyLevel?: 'capture_only' | 'suggest' | 'act_with_constraints';
  timestamp: number;
}
```

#### Meeting Events
**`meeting_started`**
```typescript
{
  type: 'meeting_started';
  meetingId: string;
  classification?: {
    presetMatch: string;
    category: string;
    confidence: number;
  };
  startTime: string;
  timestamp: number;
}
```

**`meeting_ended`**
```typescript
{
  type: 'meeting_ended';
  meetingId: string;
  endTime: string;
  timestamp: number;
}
```

**`meeting_processing`**
```typescript
{
  type: 'meeting_processing';
  meetingId: string;
  stage: string;
  timestamp: number;
}
```

#### Notes Events
**`notes_ready`**
```typescript
{
  type: 'notes_ready';
  meetingId: string;
  noteId: string;
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    id: string;
    task: string;
    priority: 'low' | 'medium' | 'high';
    owner: string;
    dueDate?: string;
  }>;
  timestamp: number;
}
```

#### Research Events
**`research_started`**
```typescript
{
  type: 'research_started';
  researchId: string;
  query: string;
  queryType: string;
  timestamp: number;
}
```

**`research_progress`**
```typescript
{
  type: 'research_progress';
  researchId: string;
  stage: string;
  message: string;
  partialResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  timestamp: number;
}
```

**`research_complete`**
```typescript
{
  type: 'research_complete';
  researchId: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    content?: string;
  }>;
  summary?: string;
  timestamp: number;
}
```

#### Command Events
**`command_received`**
```typescript
{
  type: 'command_received';
  command: {
    type: 'research' | 'summarize' | 'end_meeting' | 'enable_transcript' | 'disable_transcript';
    target?: string;
    isComplete: boolean;
  };
  timestamp: number;
}
```

**`command_executed`**
```typescript
{
  type: 'command_executed';
  command: string;
  result: any;
  timestamp: number;
}
```

#### Security Events
**`sensitive_detected`**
```typescript
{
  type: 'sensitive_detected';
  topics: string[];
  action: string;
  timestamp: number;
}
```

**Usage Example**:
```typescript
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { isConnected, events, lastEvent, error, reconnect } = useSSE(userId);

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'transcript':
        handleTranscript(lastEvent);
        break;
      case 'notes_ready':
        handleNotesReady(lastEvent);
        break;
      case 'research_complete':
        handleResearchComplete(lastEvent);
        break;
    }
  }, [lastEvent]);

  if (!isConnected) {
    return <ConnectionError onRetry={reconnect} />;
  }

  return <div>Connected and listening for events...</div>;
}
```

---

### 3. Views Layer

#### TodayView (`src/webview/views/TodayView.tsx`)

Real-time meeting transcription and activity monitoring.

**Features**:
- Live transcript updates via SSE events
- Real-time meeting state tracking
- Meeting detection with classification
- Processing status indicators
- Note generation tracking
- Research progress monitoring
- Sensitive content detection alerts
- Mock data fallback for development

**Data Sources**:
- SSE events: `transcript`, `state_update`, `meeting_started`, `meeting_ended`, `meeting_processing`, `notes_ready`, `research_started`, `research_progress`, `research_complete`
- API: Initial state on mount

#### NotesView (`src/webview/views/NotesView.tsx`)

Notes management and organization.

**Features**:
- Fetch notes by date from API
- Display notes organized by folder
- Star/unstar notes
- View note details (summary, key decisions, action items)
- Create manual notes
- Regenerate note summaries
- Email notes to recipients
- Loading skeleton states
- Error handling with retry
- Mock data fallback

**Data Sources**:
- API: `getNotes()`, `getNote()`, `updateNote()`, `regenerateNotes()`, `emailNote()`
- SSE events: `notes_ready` for real-time updates

#### ActionsView (`src/webview/views/ActionsView.tsx`)

Action item tracking and management.

**Features**:
- Fetch action items from API with status/priority filters
- Update action status with optimistic updates
- Edit action details
- Delete action items
- Filter by status (Todo, In Progress, Done)
- Filter by priority (Low, Medium, High)
- Loading states
- Error handling with rollback
- Mock data fallback

**Data Sources**:
- API: `getActionItems()`, `updateActionItem()`, `deleteActionItem()`, `createActionItem()`

#### AgentsView (`src/webview/views/AgentsView.tsx`)

Settings and meeting preset configuration.

**Features**:
- Fetch user settings from API
- Fetch meeting presets from API
- Update autonomy level (capture_only, suggest, act_with_constraints)
- Configure preset conditions and rules
- Manage note generation rules
- Configure research triggers
- Save changes to backend
- Loading states
- Error handling

**Data Sources**:
- API: `getSettings()`, `updateSettings()`, `getPresets()`, `updatePreset()`, `createPreset()`, `deletePreset()`

---

### 4. Shared Components

#### SkeletonLoader (`src/webview/components/shared/SkeletonLoader.tsx`)

Loading placeholder components with skeleton animation.

**Variants**:
- `card` - For note/meeting cards
- `list` - For list items
- `text` - For text content
- `grid` - For grid layouts

**Specialized Skeletons**:
- `TabSkeleton` - For tab content loading
- `NotesSkeleton` - For notes view loading
- `ActionsSkeleton` - For actions view loading
- `SettingsSkeleton` - For settings view loading

**Usage**:
```typescript
import { SkeletonLoader, NotesSkeleton } from '@/components/shared';

function NotesView() {
  if (loading) return <NotesSkeleton />;
  return <NotesContent />;
}
```

#### ErrorState (`src/webview/components/shared/ErrorState.tsx`)

Error display components with recovery options.

**Components**:
- `ErrorState` - Full error display with retry/close buttons
- `ErrorMessage` - Inline error message
- `ConnectionErrorState` - Backend connection failure
- `NoDataState` - Empty state
- `TimeoutErrorState` - Request timeout
- `PermissionErrorState` - Access denied
- `ServerErrorState` - Server error 5xx

**Usage**:
```typescript
import { ErrorState, ConnectionErrorState } from '@/components/shared';

function NotesView() {
  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  if (!isConnected) {
    return <ConnectionErrorState onRetry={reconnect} />;
  }

  return <NotesContent />;
}
```

---

## Data Flow Architecture

### Request Flow (View → API)

```
User Action
    ↓
View Component
    ↓
API Client Method
    ↓
Fetch Request (with auth cookies)
    ↓
Backend REST Endpoint
    ↓
Response (JSON)
    ↓
Type-safe TypeScript Object
    ↓
State Update (React)
    ↓
Re-render
```

### Real-Time Flow (SSE)

```
Backend Event
    ↓
SSE Stream (/api/events)
    ↓
useSSE Hook
    ↓
Event Parsing & Typing
    ↓
State Update (events[], lastEvent)
    ↓
useEffect Listener
    ↓
Handler Function
    ↓
State Update (React)
    ↓
Re-render
```

---

## Development Mode

### Features

**Mock Data Mode** - Allows testing UI without backend

Toggle via:
```typescript
localStorage.setItem('sega:forceMockData', 'true');
localStorage.removeItem('sega:forceMockData'); // disable
```

Keyboard shortcuts (in dev mode):
- `Cmd+Shift+D` - Toggle mock data mode
- `Cmd+Shift+S` - Show dev stats in console

**Utilities** (`src/webview/lib/devMode.ts`):

```typescript
import {
  isDevelopmentMode,
  getForceMockDataMode,
  toggleForceMockDataMode,
  fetchWithFallback,
  retryWithBackoff,
  trackApiCall,
  getApiStats,
  getDevModeStatus,
  setupDevModeShortcuts
} from '@/lib/devMode';

// Fetch with automatic mock fallback
const { data, isMock } = await fetchWithFallback(
  () => api.getNotes({ date: selectedDate }),
  mockNotes,
  'Failed to load notes'
);

// Retry with exponential backoff
const data = await retryWithBackoff(
  () => api.getMeetings(),
  3,  // max retries
  1000 // base delay ms
);

// Track API performance
const result = await trackApiCall('getNotes', () => api.getNotes());
console.table(getApiStats());
```

---

## Type System

All TypeScript types are defined in two locations:

### API Types (`src/webview/api/client.ts`)

```typescript
// Data models
export interface Meeting { ... }
export interface Note { ... }
export interface ActionItem { ... }
export interface ResearchResult { ... }
export interface UserSettings { ... }
export interface MeetingPreset { ... }
```

### SSE Event Types (`src/webview/hooks/useSSE.ts`)

```typescript
// Typed events
export interface TranscriptEvent extends SSEEvent { ... }
export interface NotesReadyEvent extends SSEEvent { ... }
export interface ResearchCompleteEvent extends SSEEvent { ... }

// Union type for type-safe event handling
export type AnySSEEvent = TranscriptEvent | StateUpdateEvent | ... ;
```

---

## Error Handling Strategy

### API Errors
1. Network errors → ConnectionErrorState with fallback to mock data
2. 4xx errors → Specific error message with retry option
3. 5xx errors → ServerErrorState with retry option
4. Timeout → TimeoutErrorState with exponential backoff retry

### SSE Errors
1. Connection failure → Auto-reconnect with 3s delay
2. Parse error → Log to console, continue listening
3. Unmount cleanup → Properly close EventSource

### Component Error Boundaries
- TodayView: Falls back to mock event data
- NotesView: Shows SkeletonLoader → Data → ErrorState
- ActionsView: Shows SkeletonLoader → Data → ErrorState
- AgentsView: Shows SkeletonLoader → Data → ErrorState

---

## Authentication & Cookies

The API client automatically includes authentication cookies:

```typescript
credentials: 'include' // For Mentra auth cookies
```

The backend is expected to provide:
- Session cookie on login
- CSRF tokens if needed
- Cookie-based session management

---

## State Management

Uses React hooks for local state:
- `useState` - Component-level state
- `useEffect` - Side effects (API calls, SSE setup)
- `useRef` - Persistent values across renders (SSE connection)
- `useCallback` - Memoized callbacks for performance

No external state management library (Redux, Zustand, etc.) - keeps dependencies minimal.

---

## File Structure

```
src/webview/
├── api/
│   └── client.ts                    # REST API client (all endpoints)
├── hooks/
│   └── useSSE.ts                    # SSE event hook with typed events
├── lib/
│   └── devMode.ts                   # Development utilities
├── views/
│   ├── TodayView.tsx                # Real-time transcription/meetings
│   ├── NotesView.tsx                # Notes management
│   ├── ActionsView.tsx              # Action item tracking
│   └── AgentsView.tsx               # Settings & presets
├── components/
│   ├── shared/
│   │   ├── index.ts                 # Barrel export
│   │   ├── SkeletonLoader.tsx       # Loading states
│   │   ├── ErrorState.tsx           # Error displays
│   │   └── GlassesPreviewModal.tsx  # Glasses preview
│   ├── layout/
│   │   ├── TopBar.tsx               # Top navigation
│   │   └── Sidebar.tsx              # Sidebar navigation
│   └── ui/                          # Radix UI components
├── App.tsx                          # Main app component
└── index.tsx                        # Entry point
```

---

## Integration Checklist

### When Backend is Ready:

- [ ] Backend running on `http://localhost:3000/api`
- [ ] SSE endpoint available at `/api/events`
- [ ] All REST endpoints implemented per spec
- [ ] Authentication/cookies working
- [ ] MongoDB persistence enabled

### Frontend Verification:

- [ ] Remove `localStorage.setItem('sega:forceMockData', 'true')`
- [ ] TodayView receives live transcript events
- [ ] NotesView fetches notes from API
- [ ] ActionsView syncs with backend
- [ ] AgentsView saves settings
- [ ] Error handling works (test offline mode)
- [ ] Loading skeletons appear during data fetch
- [ ] Connection indicator shows status

### Testing Steps:

1. Start backend and frontend
2. Open browser console
3. Check `[SSE] Connected` message
4. Verify `/api/events` connection in Network tab
5. Simulate meeting event, verify real-time update
6. Offline mode: Disable backend, verify fallback to mock data
7. Reload page, verify persisted data loads

---

## Performance Considerations

- **SSE Buffering**: Only keeps last 100 events in memory
- **Optimistic Updates**: Action items update immediately with rollback on error
- **Lazy Loading**: Notes/actions loaded on demand by date/filter
- **Debouncing**: Settings save debounced to prevent spam requests
- **Memoization**: useCallback for stable function references

---

## Security Considerations

- **HTTPS Only**: All API calls should be HTTPS in production
- **CORS**: Backend should set appropriate CORS headers
- **CSP**: Content Security Policy headers recommended
- **XSS Protection**: React automatically escapes content
- **CSRF**: If needed, backend should provide CSRF tokens
- **Sensitive Data**: Sensitive topics are tracked server-side, not logged client-side

---

## Next Steps for Backend Team

1. Implement all REST endpoints from `/docs/product-spec.md`
2. Implement SSE endpoint at `/api/events`
3. Add proper TypeScript response types matching `client.ts` interfaces
4. Configure CORS for frontend origin
5. Setup session/authentication cookies
6. Add MongoDB persistence
7. Implement meeting detection and classification
8. Implement note generation pipeline
9. Implement research backend
10. Test with frontend using dev mode toggle

---

## Support & Debugging

### Enable Verbose Logging

```typescript
// In browser console
localStorage.setItem('DEBUG_SEGA', 'true');
```

### Check Dev Mode Status

```typescript
// In browser console
import { getDevModeStatus } from '@/lib/devMode';
console.log(getDevModeStatus());
```

### View API Stats

```typescript
// In browser console
import { getApiStats } from '@/lib/devMode';
console.table(getApiStats());
```

### Monitor SSE Events

```typescript
// useSSE hook logs all events to console
// Check Network tab → Events stream
// Look for [SSE] Received event: ... messages
```

---

**Last Updated**: 2026-01-31
**Frontend Status**: ✅ Production Ready
**Backend Status**: Awaiting Implementation
