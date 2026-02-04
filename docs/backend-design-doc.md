# SEGA Backend Design Document

**Smart Executive Glasses Assistant**

Version: 1.0 (Hackathon)  
Last Updated: January 31, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Manager Architecture](#manager-architecture)
4. [Data Flow](#data-flow)
5. [Manager Details](#manager-details)
6. [Inter-Manager Communication](#inter-manager-communication)
7. [SSE Events](#sse-events)
8. [Database Models](#database-models)
9. [External Services](#external-services)

---

## Overview

The SEGA backend follows a **manager-based architecture** where each manager has a single responsibility. The `UserSession` acts as the container for all managers, and `AgentManager` serves as the central brain that orchestrates intelligence and dispatches actions to other managers.

### Key Principles

1. **Single Responsibility** - Each manager does one thing well
2. **AgentManager is the Brain** - Central intelligence, state management, command handling
3. **Managers Don't Call Each Other Directly** - Communication flows through AgentManager or events
4. **Real-Time First** - SSE broadcasts keep UI in sync with backend state

---

## Directory Structure

```
src/
├── index.ts                        # Entry point, Bun.serve setup
├── app/
│   ├── index.ts                    # SegaApp extends AppServer
│   └── session/
│       ├── UserSession.ts          # Container for all managers
│       ├── AgentManager.ts         # Brain - analysis loop, state, commands
│       ├── TranscriptManager.ts    # Transcript buffer, DB persistence
│       ├── MeetingManager.ts       # Meeting lifecycle, DB operations
│       ├── NotesManager.ts         # Note generation, action extraction
│       ├── ResearchManager.ts      # Firecrawl deep research
│       ├── SettingsManager.ts      # User settings, presets, sensitive topics
│       ├── DisplayManager.ts       # Glasses display control
│       └── BroadcastManager.ts     # SSE client management
├── api/
│   └── router.ts                   # Hono API routes
├── services/
│   ├── llm/
│   │   ├── index.ts                # LLM provider factory
│   │   ├── types.ts                # Unified types
│   │   ├── gemini.ts               # Gemini provider
│   │   └── anthropic.ts            # Claude provider
│   ├── db/
│   │   ├── index.ts                # MongoDB connection
│   │   └── models.ts               # Mongoose models
│   └── email/
│       └── index.ts                # Resend email service
└── webview/
    └── ...                         # Frontend (separate engineer)
```

---

## Manager Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            UserSession                                   │
│                     (Container for all managers)                         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         AgentManager                                │ │
│  │                   (Brain - orchestrates everything)                 │ │
│  │                                                                     │ │
│  │  • Analysis loop (every 5 sec)                                      │ │
│  │  • Session state management                                         │ │
│  │  • Command interpretation                                           │ │
│  │  • Dispatches to other managers                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│         │              │              │              │                   │
│         ▼              ▼              ▼              ▼                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐             │
│  │ Meeting   │  │  Notes    │  │ Research  │  │ Display   │             │
│  │ Manager   │  │  Manager  │  │  Manager  │  │  Manager  │             │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘             │
│                                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                            │
│  │Transcript │  │ Settings  │  │ Broadcast │                            │
│  │ Manager   │  │  Manager  │  │  Manager  │                            │
│  └───────────┘  └───────────┘  └───────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Transcription Flow

```
MentraOS (Glasses)
       │
       │ WebSocket: transcription events
       ▼
   AppSession
       │
       │ onTranscription callback
       ▼
   UserSession
       │
       │ routes to TranscriptManager
       ▼
TranscriptManager
       │
       ├──► Buffer in memory
       ├──► Broadcast 'transcript' event via BroadcastManager
       ├──► Flush to MongoDB every 5 min
       │
       │ notify AgentManager of new transcript
       ▼
  AgentManager
       │
       │ if "SEGA" detected → immediate analysis
       │ else → wait for 5 sec timer
       ▼
   LLM Analysis
       │
       │ Returns: meeting state, commands, classification
       ▼
  AgentManager
       │
       ├──► Update session state
       ├──► Dispatch to MeetingManager (start/end meeting)
       ├──► Dispatch to NotesManager (generate notes)
       ├──► Dispatch to ResearchManager (do research)
       ├──► Dispatch to DisplayManager (update glasses)
       └──► Broadcast state events via BroadcastManager
```

### Meeting Lifecycle Flow

```
AgentManager detects meeting started
       │
       ▼
MeetingManager.startMeeting({ classification })
       │
       ├──► Create Meeting document
       ├──► Record transcript startIndex
       └──► Return meeting object
       │
       ▼
AgentManager broadcasts 'meeting_started'
       │
       │ ... time passes, transcripts flow ...
       │
       ▼
AgentManager detects meeting ended
       │
       ▼
MeetingManager.endMeeting()
       │
       ├──► Record transcript endIndex
       ├──► Update status to 'ended'
       └──► Return meeting object
       │
       ▼
AgentManager broadcasts 'meeting_ended'
       │
       ▼
AgentManager dispatches to NotesManager
       │
       ▼
NotesManager.generateNotes(meeting)
       │
       ├──► Get transcript range from TranscriptManager
       ├──► Get preset rules from SettingsManager
       ├──► Call LLM to generate notes
       ├──► Create Note document
       ├──► Create ActionItem documents
       └──► Return note
       │
       ▼
AgentManager broadcasts 'notes_ready'
       │
       ▼
AgentManager checks preset for auto-research
       │
       ▼ (if enabled)
ResearchManager.research({ topics, people, companies })
       │
       ├──► Call Firecrawl
       ├──► Broadcast 'research_progress' (streaming)
       └──► Return results
       │
       ▼
AgentManager broadcasts 'research_complete'
```

---

## Manager Details

### UserSession

**File:** `session/UserSession.ts`

**Responsibility:** Container that holds all managers and routes events from AppSession.

```typescript
class UserSession {
  // Static registry
  static readonly sessions: Map<string, UserSession>;
  
  // Identity
  readonly userId: string;        // User's email from AppSession
  readonly appSession: AppSession;
  readonly logger: Logger;
  
  // Managers
  readonly transcript: TranscriptManager;
  readonly agent: AgentManager;
  readonly meeting: MeetingManager;
  readonly notes: NotesManager;
  readonly research: ResearchManager;
  readonly settings: SettingsManager;
  readonly display: DisplayManager;
  readonly broadcast: BroadcastManager;
  
  // Lifecycle
  constructor(appSession: AppSession);
  async initialize(): Promise<void>;
  dispose(): void;
  
  // Static helpers
  static get(userId: string): UserSession | undefined;
}
```

**Initialization:**
1. Create all managers
2. Initialize settings (load from DB)
3. Subscribe to transcription events from AppSession
4. Start AgentManager analysis loop

---

### AgentManager

**File:** `session/AgentManager.ts`

**Responsibility:** The brain - runs analysis loop, manages session state, interprets commands, dispatches actions.

```typescript
interface SessionState {
  status: 'idle' | 'meeting_active' | 'meeting_ended' | 'processing';
  activeMeetingId: string | null;
  lastAnalysisAt: Date | null;
  detectedSensitiveTopics: string[];
  effectiveAutonomyLevel: 'capture_only' | 'suggest' | 'act_with_constraints';
}

class AgentManager {
  private readonly userSession: UserSession;
  private state: SessionState;
  private analysisTimer: Timer | null;
  private hasNewTranscripts: boolean;
  
  // Lifecycle
  constructor(userSession: UserSession);
  start(): void;           // Start analysis loop
  stop(): void;            // Stop analysis loop
  dispose(): void;
  
  // Called by TranscriptManager
  onTranscript(segment: TranscriptSegment): void;
  
  // Analysis
  private runAnalysis(): Promise<void>;
  private shouldTriggerImmediately(text: string): boolean;  // Detects "SEGA" trigger
  
  // State
  getState(): SessionState;
  
  // Internal dispatch methods
  private handleMeetingDetected(classification: MeetingClassification): Promise<void>;
  private handleMeetingEnded(): Promise<void>;
  private handleCommand(command: ParsedCommand): Promise<void>;
  private handleSensitiveTopicDetected(topics: string[]): void;
}
```

**Analysis Loop Logic:**
```
Every 5 seconds:
  if (hasNewTranscripts) {
    hasNewTranscripts = false;
    await runAnalysis();
  }

On "SEGA" detected in transcript:
  await runAnalysis();  // Immediate
```

**LLM Analysis Prompt Returns:**
```typescript
interface AnalysisResult {
  // Meeting detection
  meetingState: 'no_meeting' | 'meeting_active' | 'meeting_ended';
  meetingClassification?: {
    presetMatch: string;
    category: string;
    confidence: number;
  };
  
  // Command detection
  command?: {
    type: 'research' | 'summarize' | 'end_meeting' | 'enable_transcript' | 'disable_transcript';
    target?: string;     // e.g., "Acme Corp" for research
    isComplete: boolean; // Is the command fully spoken?
  };
  
  // Sensitive topics
  sensitiveTopicsDetected: string[];
  
  // Participants (best effort from transcript)
  detectedParticipants: string[];
}
```

---

### TranscriptManager

**File:** `session/TranscriptManager.ts`

**Responsibility:** Buffers transcript segments in memory, flushes to DB periodically, provides transcript window for analysis.

```typescript
interface TranscriptSegment {
  timestamp: Date;
  text: string;
  speakerHint?: string;
  speakerLabel?: string;
  isFinal: boolean;
}

class TranscriptManager {
  private readonly userSession: UserSession;
  private buffer: TranscriptSegment[];
  private flushTimer: Timer | null;
  private currentDate: string;  // ISO date for DailyTranscript
  
  // Lifecycle
  constructor(userSession: UserSession);
  dispose(): void;
  
  // Receive transcripts
  handleTranscription(data: TranscriptionData): void;
  
  // Query
  getRecentWindow(durationMs: number): TranscriptSegment[];
  getRange(startIndex: number, endIndex: number): TranscriptSegment[];
  getCurrentIndex(): number;
  getFullBuffer(): TranscriptSegment[];
  
  // Persistence
  private flush(): Promise<void>;  // Save to MongoDB
  private scheduleFlush(): void;   // Every 5 minutes
}
```

**On handleTranscription:**
1. Add segment to buffer
2. Broadcast `transcript` event via BroadcastManager
3. Notify AgentManager via `agent.onTranscript(segment)`

---

### MeetingManager

**File:** `session/MeetingManager.ts`

**Responsibility:** Creates and tracks meetings, manages meeting lifecycle, DB operations.

```typescript
interface Meeting {
  id: string;
  userId: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended' | 'processing' | 'complete';
  presetId?: string;
  category?: string;
  hasSensitiveContent: boolean;
  transcriptRange: {
    startIndex: number;
    endIndex?: number;
  };
  detectedParticipants: string[];
  noteId?: string;
  researchIds: string[];
}

class MeetingManager {
  private readonly userSession: UserSession;
  private activeMeeting: Meeting | null;
  
  // Lifecycle
  constructor(userSession: UserSession);
  
  // Meeting lifecycle (called by AgentManager)
  startMeeting(params: {
    classification?: { preset: string; category: string };
    participants?: string[];
  }): Meeting;
  
  endMeeting(): Meeting;
  
  markAsProcessing(meetingId: string): Promise<void>;
  markAsComplete(meetingId: string, noteId: string): Promise<void>;
  
  // Sensitive content
  markSensitive(meetingId: string): Promise<void>;
  
  // Query
  getActiveMeeting(): Meeting | null;
  isInMeeting(): boolean;
  
  // DB operations
  getMeeting(id: string): Promise<Meeting | null>;
  getMeetingsForDate(date: string): Promise<Meeting[]>;
  getMeetingsForUser(): Promise<Meeting[]>;
  
  // Research attachment
  attachResearch(meetingId: string, researchId: string): Promise<void>;
}
```

---

### NotesManager

**File:** `session/NotesManager.ts`

**Responsibility:** Generates structured notes from meeting transcripts, extracts action items.

```typescript
interface Note {
  id: string;
  userId: string;
  meetingId?: string;
  date: string;
  timeRange?: { start: Date; end: Date };
  type: 'ai_generated' | 'manual';
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  isSensitive: boolean;
  isStarred: boolean;
}

interface ActionItem {
  id: string;
  userId: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
  owner: string;
  dueDate?: Date;
  status: 'todo' | 'in_progress' | 'done';
  sourceMeetingId?: string;
  sourceNoteId?: string;
}

class NotesManager {
  private readonly userSession: UserSession;
  
  // Lifecycle
  constructor(userSession: UserSession);
  
  // Note generation (called by AgentManager)
  async generateNotes(meeting: Meeting): Promise<Note>;
  
  // Manual notes
  async createManualNote(content: string, meetingId?: string): Promise<Note>;
  
  // Regenerate
  async regenerateNotes(noteId: string): Promise<Note>;
  
  // Email
  async emailNote(noteId: string, recipient?: string): Promise<void>;
  
  // Query
  async getNote(id: string): Promise<Note | null>;
  async getNotesForDate(date: string): Promise<Note[]>;
  async getNotesForMeeting(meetingId: string): Promise<Note | null>;
  
  // Action items
  async getActionItems(filters?: ActionItemFilters): Promise<ActionItem[]>;
  async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem>;
  async createManualAction(action: Omit<ActionItem, 'id'>): Promise<ActionItem>;
}
```

**generateNotes flow:**
1. Get transcript range from TranscriptManager
2. Get preset rules from SettingsManager
3. Build LLM prompt with transcript and preset instructions
4. Call LLM
5. Parse response into Note and ActionItem objects
6. Save to DB
7. Return Note

---

### ResearchManager

**File:** `session/ResearchManager.ts`

**Responsibility:** Handles deep research via Firecrawl, streams progress updates.

```typescript
interface ResearchRequest {
  query: string;
  type: 'person' | 'company' | 'topic' | 'general';
  meetingId?: string;
}

interface ResearchResult {
  id: string;
  userId: string;
  query: string;
  queryType: string;
  triggerType: 'automatic' | 'explicit';
  meetingId?: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  results: SearchResult[];
  summary?: string;
}

class ResearchManager {
  private readonly userSession: UserSession;
  private activeResearch: Map<string, ResearchResult>;
  
  // Lifecycle
  constructor(userSession: UserSession);
  
  // Research (called by AgentManager)
  async research(request: ResearchRequest): Promise<ResearchResult>;
  
  // Batch research (for auto-research after meeting)
  async researchMultiple(requests: ResearchRequest[]): Promise<ResearchResult[]>;
  
  // Query
  getActiveResearch(): ResearchResult[];
  async getResearch(id: string): Promise<ResearchResult | null>;
  async getResearchForMeeting(meetingId: string): Promise<ResearchResult[]>;
  
  // Email
  async emailResearch(researchId: string, recipient?: string): Promise<void>;
}
```

**research flow:**
1. Create ResearchResult doc with status 'pending'
2. Broadcast `research_started`
3. Call Firecrawl search
4. For each result, broadcast `research_progress`
5. Generate summary with LLM
6. Update status to 'complete'
7. Broadcast `research_complete`
8. Return result

---

### SettingsManager

**File:** `session/SettingsManager.ts`

**Responsibility:** Manages user settings, meeting presets, sensitive topics.

```typescript
interface UserSettings {
  autonomyLevel: 'capture_only' | 'suggest' | 'act_with_constraints';
  showTranscriptOnGlasses: boolean;
  emailSummaries: boolean;
  emailAddress?: string;
}

interface MeetingPreset {
  id: string;
  userId: string;
  name: string;
  condition: string;  // Natural language for LLM classification
  category: string;
  isActive: boolean;
  userContext: string;
  noteRules: NoteRules;
  researchTriggers: ResearchTriggers;
  sensitive?: boolean;
}

interface SensitiveTopic {
  id: string;
  userId: string;
  keyword: string;
  isActive: boolean;
}

class SettingsManager {
  private readonly userSession: UserSession;
  private settings: UserSettings;
  private presets: MeetingPreset[];
  private sensitiveTopics: SensitiveTopic[];
  
  // Lifecycle
  constructor(userSession: UserSession);
  async initialize(): Promise<void>;  // Load from DB
  
  // Settings
  getSettings(): UserSettings;
  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings>;
  
  // Presets
  getPresets(): MeetingPreset[];
  getActivePresets(): MeetingPreset[];
  async createPreset(preset: Omit<MeetingPreset, 'id'>): Promise<MeetingPreset>;
  async updatePreset(id: string, updates: Partial<MeetingPreset>): Promise<MeetingPreset>;
  async deletePreset(id: string): Promise<void>;
  
  // Sensitive topics
  getSensitiveTopics(): SensitiveTopic[];
  async addSensitiveTopic(keyword: string): Promise<SensitiveTopic>;
  async removeSensitiveTopic(id: string): Promise<void>;
  
  // Helpers for AgentManager
  getPresetsForClassification(): string;  // Formatted for LLM prompt
  getSensitiveKeywords(): string[];
}
```

---

### DisplayManager

**File:** `session/DisplayManager.ts`

**Responsibility:** Controls what's displayed on the glasses.

```typescript
class DisplayManager {
  private readonly userSession: UserSession;
  private transcriptEnabled: boolean;
  
  // Lifecycle
  constructor(userSession: UserSession);
  dispose(): void;
  
  // Transcript display
  enableTranscript(): void;
  disableTranscript(): void;
  isTranscriptEnabled(): boolean;
  
  // Show content on glasses
  showText(text: string, durationMs?: number): void;
  showStatus(status: string): void;
  showResearchResult(summary: string): void;
  
  // Called by TranscriptManager when transcript display is enabled
  displayTranscript(text: string, isFinal: boolean): void;
  
  // Dashboard widget
  updateDashboard(state: SessionState): void;
}
```

---

### BroadcastManager

**File:** `session/BroadcastManager.ts`

**Responsibility:** Manages SSE client connections and broadcasts events.

```typescript
interface SSEClient {
  send(data: any): void;
}

class BroadcastManager {
  private readonly userSession: UserSession;
  private clients: Set<SSEClient>;
  
  // Lifecycle
  constructor(userSession: UserSession);
  dispose(): void;
  
  // Client management
  addClient(client: SSEClient): void;
  removeClient(client: SSEClient): void;
  getClientCount(): number;
  
  // Broadcast
  emit(event: string, data?: any): void;
}
```

**Usage:**
```typescript
// From AgentManager
this.userSession.broadcast.emit('meeting_started', { 
  meetingId: meeting.id,
  classification: meeting.category,
  startTime: meeting.startTime
});

// From TranscriptManager
this.userSession.broadcast.emit('transcript', {
  text: segment.text,
  timestamp: segment.timestamp,
  speakerHint: segment.speakerHint,
  isFinal: segment.isFinal
});
```

---

## Inter-Manager Communication

### Who Calls Who

| Caller | Calls | For |
|--------|-------|-----|
| UserSession | All managers | Initialization, disposal |
| UserSession | TranscriptManager | Route transcription events |
| TranscriptManager | AgentManager | Notify of new transcript |
| TranscriptManager | BroadcastManager | Emit transcript events |
| TranscriptManager | DisplayManager | Show transcript on glasses (if enabled) |
| AgentManager | MeetingManager | Start/end meetings |
| AgentManager | NotesManager | Generate notes |
| AgentManager | ResearchManager | Trigger research |
| AgentManager | SettingsManager | Get presets, sensitive topics |
| AgentManager | DisplayManager | Update glasses display |
| AgentManager | BroadcastManager | Emit state events |
| NotesManager | TranscriptManager | Get transcript range |
| NotesManager | SettingsManager | Get preset rules |
| ResearchManager | BroadcastManager | Emit research progress |
| ResearchManager | MeetingManager | Attach research to meeting |

### Managers Access Each Other Via UserSession

```typescript
// In AgentManager
const meeting = this.userSession.meeting.startMeeting({ ... });
const note = await this.userSession.notes.generateNotes(meeting);
this.userSession.broadcast.emit('notes_ready', { ... });
```

---

## SSE Events

| Event | Emitted By | Payload |
|-------|------------|---------|
| `transcript` | TranscriptManager | `{ text, timestamp, speakerHint, isFinal }` |
| `state_update` | AgentManager | `{ status, activeMeetingId, ... }` |
| `meeting_started` | AgentManager | `{ meetingId, classification, startTime }` |
| `meeting_ended` | AgentManager | `{ meetingId, endTime }` |
| `meeting_processing` | AgentManager | `{ meetingId, stage }` |
| `notes_ready` | AgentManager | `{ meetingId, noteId, summary, keyDecisions, actionItems }` |
| `research_started` | ResearchManager | `{ researchId, query, type }` |
| `research_progress` | ResearchManager | `{ researchId, stage, message, partialResults }` |
| `research_complete` | ResearchManager | `{ researchId, results, summary }` |
| `command_received` | AgentManager | `{ command, target }` |
| `command_executed` | AgentManager | `{ command, result }` |
| `sensitive_detected` | AgentManager | `{ topics, action }` |

---

## Database Models

### Collections

| Collection | Document | Manager |
|------------|----------|---------|
| `daily_transcripts` | DailyTranscript | TranscriptManager |
| `meetings` | Meeting | MeetingManager |
| `notes` | Note | NotesManager |
| `action_items` | ActionItem | NotesManager |
| `research_results` | ResearchResult | ResearchManager |
| `user_settings` | UserSettings | SettingsManager |
| `meeting_presets` | MeetingPreset | SettingsManager |
| `sensitive_topics` | SensitiveTopic | SettingsManager |

### Indexes

```javascript
// daily_transcripts
{ userId: 1, date: 1 }  // unique

// meetings
{ userId: 1, date: 1 }
{ userId: 1, status: 1 }

// notes
{ userId: 1, date: 1 }
{ userId: 1, meetingId: 1 }

// action_items
{ userId: 1, status: 1 }
{ userId: 1, sourceMeetingId: 1 }

// research_results
{ userId: 1, meetingId: 1 }
```

---

## External Services

### LLM (Gemini / Claude)

**Location:** `services/llm/`

**Used By:** AgentManager, NotesManager, ResearchManager

**Calls:**
- AgentManager: Analysis loop (meeting detection, command parsing)
- NotesManager: Note generation, action extraction
- ResearchManager: Summarize research results

### Firecrawl

**Location:** `services/research/` or inline in ResearchManager

**Used By:** ResearchManager

**Calls:**
- `firecrawl.search(query)` - Web search
- `firecrawl.scrapeUrl(url)` - Deep scrape specific URL

### Resend (Email)

**Location:** `services/email/`

**Used By:** NotesManager, ResearchManager

**Calls:**
- Send note summary email
- Send research report email

### MongoDB

**Location:** `services/db/`

**Used By:** All managers for persistence

---

## Implementation Order

### Phase 1: Foundation
1. `UserSession.ts` - Basic structure, manager instantiation
2. `BroadcastManager.ts` - SSE client management
3. `TranscriptManager.ts` - Buffer, broadcast (no DB yet)
4. `SettingsManager.ts` - In-memory settings (no DB yet)

### Phase 2: Intelligence
5. `AgentManager.ts` - Analysis loop, state machine
6. `MeetingManager.ts` - Meeting lifecycle (in-memory)
7. `DisplayManager.ts` - Glasses display

### Phase 3: Output
8. `NotesManager.ts` - Note generation
9. `ResearchManager.ts` - Firecrawl integration

### Phase 4: Persistence
10. `services/db/` - MongoDB connection and models
11. Update managers to persist to DB

### Phase 5: Polish
12. Email integration
13. Error handling
14. Edge cases