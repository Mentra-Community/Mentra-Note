# SEGA Implementation Guide

**For Engineers Starting Fresh**

This guide provides everything you need to implement SEGA's backend without prior context. Read this alongside `product-spec.md` and `backend-design-doc.md`.

---

## Table of Contents

1. [Current Codebase State](#current-codebase-state)
2. [MentraOS SDK Patterns](#mentraos-sdk-patterns)
3. [Key Decisions & Rationale](#key-decisions--rationale)
4. [Implementation Checklist](#implementation-checklist)
5. [Code Patterns & Examples](#code-patterns--examples)
6. [Common Pitfalls](#common-pitfalls)

---

## Current Codebase State

### What Exists (Needs to be Replaced/Refactored)

The current `src/backend/` structure was a rough prototype. It should be **replaced** with the new manager-based architecture defined in `backend-design-doc.md`.

```
src/
├── index.ts                    # Keep - entry point, but update
├── backend/
│   ├── index.ts                # REPLACE with app/index.ts (SegaApp)
│   ├── api/
│   │   ├── router.ts           # KEEP but update for new managers
│   │   └── sse.ts              # REPLACE with BroadcastManager
│   └── services/
│       └── agent/
│           ├── ChatAgent.ts    # REPLACE with AgentManager + NotesManager
│           └── llm/            # KEEP - LLM abstraction is good
└── webview/                    # KEEP - frontend engineer handles this
```

### Target Structure (What to Build)

```
src/
├── index.ts                    # Entry point
├── app/
│   ├── index.ts                # SegaApp extends AppServer
│   └── session/
│       ├── UserSession.ts
│       ├── AgentManager.ts
│       ├── TranscriptManager.ts
│       ├── MeetingManager.ts
│       ├── NotesManager.ts
│       ├── ResearchManager.ts
│       ├── SettingsManager.ts
│       ├── DisplayManager.ts
│       └── BroadcastManager.ts
├── api/
│   └── router.ts               # Hono API routes
├── services/
│   ├── llm/                    # Keep existing
│   ├── db/
│   │   ├── index.ts            # MongoDB connection
│   │   └── models.ts           # Mongoose models
│   └── email/
│       └── index.ts            # Resend
└── webview/                    # Frontend (separate engineer)
```

---

## MentraOS SDK Patterns

### Reference: live-captions App

The `apps/live-captions/` app is the reference implementation for the manager pattern. Key files to study:

- `src/app/index.ts` - How to extend AppServer
- `src/app/session/UserSession.ts` - Manager container pattern
- `src/app/session/TranscriptsManager.ts` - Handling transcription events

### AppServer Basics

```typescript
import { AppServer, AppSession } from "@mentra/sdk";

export class SegaApp extends AppServer {
  constructor(config: { packageName: string; apiKey: string; port: number }) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
    });
  }

  // Called when a user connects their glasses
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`New session for user ${userId}`);
    
    const userSession = new UserSession(session);
    await userSession.initialize();
  }

  // Called when user disconnects
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    console.log(`Session stopped: ${reason}`);
    UserSession.get(userId)?.dispose();
  }
}
```

### Subscribing to Transcription

```typescript
// In UserSession.initialize()
this.transcriptionCleanup = this.appSession.events.onTranscription(
  (data: TranscriptionData) => {
    // data.text - the transcribed text
    // data.isFinal - true if this is a final transcript (vs interim)
    // data.speakerId - rough speaker diarization ("1", "2", etc.)
    // data.utteranceId - unique ID for this utterance
    
    this.transcript.handleTranscription(data);
  }
);

// In dispose()
if (this.transcriptionCleanup) {
  this.transcriptionCleanup();
}
```

### Displaying on Glasses

```typescript
// Simple text display
this.appSession.layouts.showTextWall(
  "Hello from SEGA",
  { durationMs: 3000 }
);

// Dashboard widget (persistent)
this.appSession.layouts.showDoubleTextWall(
  "SEGA",           // Title
  "Meeting Active", // Subtitle
  { durationMs: 0 } // 0 = persistent until replaced
);
```

### Getting User Info

```typescript
// userId is the user's email
const userId = this.appSession.userId; // e.g., "john@example.com"

// Get logger
const logger = this.appSession.logger;
logger.info("Something happened");
logger.error({ error }, "Something failed");
```

### Simple Storage (Per-User Key-Value)

```typescript
// Store user settings
await this.appSession.simpleStorage.set("autonomyLevel", "suggest");

// Retrieve
const level = await this.appSession.simpleStorage.get("autonomyLevel");
```

---

## Key Decisions & Rationale

### Why "AgentManager" instead of "AwarenessManager"?

We originally had a separate "AwarenessManager" for meeting detection. We merged it into AgentManager because:
- Meeting detection, command handling, and state management are all tightly coupled
- They all use the same LLM analysis loop
- Simpler to have one "brain" that decides everything

### Why 5-Second Analysis Loop?

- Fast enough to feel responsive for demos
- Slow enough to not spam LLM calls
- Can trigger immediately on "SEGA" keyword detection for commands

### Why Trigger Immediately on "SEGA"?

When user says "SEGA, research Acme Corp", we don't want them to wait up to 5 seconds. Simple string detection of "SEGA" or "Sega" triggers immediate analysis.

### Why Smart Command Parsing (Not Regex)?

Commands go through the LLM, not regex parsing, because:
- User might say "SEGA... um... research that company John mentioned"
- LLM can resolve references ("that company" → from transcript context)
- LLM can detect if it's a real command vs someone talking ABOUT SEGA
- LLM can handle incomplete commands ("SEGA research—" [interruption] "—Acme Corp")

### Why DailyTranscript Instead of Individual Segments?

Storing each transcript segment as a separate document would create thousands of tiny writes per day. Instead:
- One document per user per day (`DailyTranscript`)
- Segments buffered in memory
- Flush to DB every 5 minutes
- Much more efficient

### Why Transcript Range Instead of Segment IDs?

Meetings reference their transcript by index range (`startIndex` to `endIndex`) instead of an array of segment IDs:
- More efficient (two numbers vs potentially hundreds of IDs)
- Easy to query: `transcriptManager.getRange(meeting.transcriptRange.startIndex, meeting.transcriptRange.endIndex)`

### Why No Calendar Integration?

Out of scope for hackathon. Meeting detection is purely from transcript analysis:
- LLM detects meeting-like conversation patterns
- Classifies against user's presets (which are natural language descriptions)
- No external calendar API needed

---

## Implementation Checklist

### Phase 1: Foundation (Do First)

- [ ] Create `src/app/` directory structure
- [ ] Implement `UserSession.ts`
  - Static map of userId → UserSession
  - Holds references to all managers
  - Initialize/dispose lifecycle
- [ ] Implement `BroadcastManager.ts`
  - SSE client set
  - `emit(event, data)` method
- [ ] Implement `TranscriptManager.ts`
  - In-memory buffer
  - `handleTranscription()` method
  - `getRecentWindow()` / `getRange()` / `getCurrentIndex()`
  - Broadcasts `transcript` events
  - (Skip DB flush for now)
- [ ] Implement `SettingsManager.ts`
  - In-memory settings with defaults
  - Hardcoded default presets
  - (Skip DB persistence for now)
- [ ] Update `SegaApp` (app/index.ts) to use new UserSession

**Test:** Transcripts flow from glasses → TranscriptManager → SSE → webview

### Phase 2: Intelligence (Core Feature)

- [ ] Implement `AgentManager.ts`
  - Session state object
  - 5-second analysis timer
  - `onTranscript()` hook from TranscriptManager
  - "SEGA" keyword detection for immediate trigger
  - `runAnalysis()` method that calls LLM
  - State transitions: idle → meeting_active → meeting_ended
- [ ] Implement `MeetingManager.ts`
  - `startMeeting()` / `endMeeting()` methods
  - Track active meeting
  - Record transcript range
  - (Skip DB for now, in-memory)
- [ ] Implement `DisplayManager.ts`
  - `showText()` / `showStatus()` methods
  - Transcript display toggle
- [ ] Wire up AgentManager → MeetingManager → BroadcastManager

**Test:** Say things, see meeting detection, see state changes in UI

### Phase 3: Output (Value Delivery)

- [ ] Implement `NotesManager.ts`
  - `generateNotes(meeting)` method
  - LLM call to generate summary, decisions, action items
  - (Skip DB for now)
- [ ] Implement `ResearchManager.ts`
  - Firecrawl integration
  - `research(query)` method
  - Stream progress via BroadcastManager
- [ ] Wire up: meeting ends → NotesManager → BroadcastManager
- [ ] Wire up: "SEGA research X" → ResearchManager

**Test:** Complete meeting flow, see notes generated, do explicit research

### Phase 4: Persistence

- [ ] Set up MongoDB connection (`services/db/index.ts`)
- [ ] Create Mongoose models (`services/db/models.ts`)
- [ ] Add DB operations to TranscriptManager (flush every 5 min)
- [ ] Add DB operations to MeetingManager
- [ ] Add DB operations to NotesManager
- [ ] Add DB operations to SettingsManager

**Test:** Restart server, data persists

### Phase 5: Polish

- [ ] Email integration (Resend)
- [ ] Error handling throughout
- [ ] Sensitive topic detection
- [ ] Autonomy level enforcement
- [ ] API routes for webview

---

## Code Patterns & Examples

### Manager Constructor Pattern

```typescript
export class SomeManager {
  private readonly userSession: UserSession;
  private readonly logger: Logger;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
    this.logger = userSession.logger.child({ service: "SomeManager" });
  }

  dispose(): void {
    // Clean up timers, subscriptions, etc.
  }
}
```

### Accessing Other Managers

```typescript
// Managers access each other via userSession
class AgentManager {
  private async handleMeetingEnded(): Promise<void> {
    const meeting = this.userSession.meeting.endMeeting();
    const note = await this.userSession.notes.generateNotes(meeting);
    this.userSession.broadcast.emit('notes_ready', { noteId: note.id });
  }
}
```

### SSE Broadcasting

```typescript
// In BroadcastManager
emit(event: string, data?: any): void {
  const message = { type: event, ...data, timestamp: Date.now() };
  for (const client of this.clients) {
    try {
      client.send(message);
    } catch (error) {
      this.logger.error({ error }, "Failed to send to SSE client");
    }
  }
}

// Usage
this.userSession.broadcast.emit('meeting_started', {
  meetingId: meeting.id,
  classification: meeting.category
});
```

### LLM Analysis Call

```typescript
// In AgentManager
private async runAnalysis(): Promise<void> {
  const recentTranscript = this.userSession.transcript.getRecentWindow(3 * 60 * 1000); // Last 3 min
  const presets = this.userSession.settings.getPresetsForClassification();
  const sensitiveKeywords = this.userSession.settings.getSensitiveKeywords();

  const prompt = `
You are analyzing a conversation transcript.

Current state: ${this.state.status}
Active meeting: ${this.state.activeMeetingId ? 'Yes' : 'No'}

Recent transcript:
${recentTranscript.map(s => `[${s.timestamp}] ${s.text}`).join('\n')}

Available meeting presets:
${presets}

Sensitive topics to detect: ${sensitiveKeywords.join(', ')}

Analyze and respond with JSON:
{
  "meetingState": "no_meeting" | "meeting_active" | "meeting_ended",
  "meetingClassification": { "preset": string, "category": string, "confidence": number } | null,
  "command": { "type": string, "target": string, "isComplete": boolean } | null,
  "sensitiveTopicsDetected": string[],
  "detectedParticipants": string[]
}
`;

  const response = await this.llm.chat(prompt);
  const result = JSON.parse(response);
  
  // Handle state transitions
  if (result.meetingState === 'meeting_active' && this.state.status === 'idle') {
    await this.handleMeetingDetected(result.meetingClassification);
  } else if (result.meetingState === 'meeting_ended' && this.state.status === 'meeting_active') {
    await this.handleMeetingEnded();
  }
  
  // Handle commands
  if (result.command?.isComplete) {
    await this.handleCommand(result.command);
  }
  
  // Handle sensitive topics
  if (result.sensitiveTopicsDetected.length > 0) {
    this.handleSensitiveTopicDetected(result.sensitiveTopicsDetected);
  }
}
```

### Timer Pattern for Analysis Loop

```typescript
class AgentManager {
  private analysisTimer: Timer | null = null;
  private hasNewTranscripts = false;

  start(): void {
    this.analysisTimer = setInterval(() => {
      if (this.hasNewTranscripts) {
        this.hasNewTranscripts = false;
        this.runAnalysis().catch(err => {
          this.logger.error({ err }, "Analysis failed");
        });
      }
    }, 5000); // Every 5 seconds
  }

  onTranscript(segment: TranscriptSegment): void {
    this.hasNewTranscripts = true;
    
    // Immediate trigger on "SEGA" keyword
    if (this.shouldTriggerImmediately(segment.text)) {
      this.hasNewTranscripts = false;
      this.runAnalysis().catch(err => {
        this.logger.error({ err }, "Immediate analysis failed");
      });
    }
  }

  private shouldTriggerImmediately(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('sega') || lower.includes('hey sega');
  }

  stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }
}
```

---

## Common Pitfalls

### 1. Don't Forget to Dispose

Every manager should have a `dispose()` method that cleans up:
- Timers (`clearInterval`, `clearTimeout`)
- Event subscriptions (call the cleanup function)
- SSE clients (clear the set)

UserSession.dispose() should call dispose() on all managers.

### 2. Handle Async Errors

LLM calls, DB operations, and Firecrawl calls can fail. Always wrap in try/catch:

```typescript
try {
  const result = await this.llm.chat(prompt);
} catch (error) {
  this.logger.error({ error }, "LLM call failed");
  // Don't crash - gracefully handle
}
```

### 3. Don't Block the Transcription Handler

`TranscriptManager.handleTranscription()` is called frequently. Don't do slow operations synchronously:

```typescript
// BAD
handleTranscription(data) {
  this.buffer.push(segment);
  await this.flushToDb(); // Blocks!
}

// GOOD
handleTranscription(data) {
  this.buffer.push(segment);
  this.scheduleFlush(); // Non-blocking
}
```

### 4. Remember userId is Email

`userId` from AppSession is the user's email address (e.g., "john@example.com"), not a UUID. This is used as the key for:
- UserSession map
- Database queries
- DailyTranscript document IDs (`{userId}_{date}`)

### 5. Transcript Segments Don't Have IDs

Individual transcript segments are embedded in DailyTranscript, not separate documents. They're identified by their index in the array, not by ID.

### 6. SSE Clients Can Disconnect Anytime

Always wrap SSE sends in try/catch and handle client disconnection gracefully:

```typescript
for (const client of this.clients) {
  try {
    client.send(message);
  } catch {
    this.clients.delete(client); // Remove dead client
  }
}
```

### 7. LLM Response Parsing

LLM responses might not be valid JSON. Always handle parse errors:

```typescript
try {
  const result = JSON.parse(response);
} catch {
  this.logger.error("Failed to parse LLM response as JSON");
  return; // Skip this analysis cycle
}
```

---

## Environment Variables

Required in `.env`:

```
PACKAGE_NAME=com.mentra.sega
MENTRAOS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here      # Or ANTHROPIC_API_KEY
FIRECRAWL_API_KEY=your_key_here   # For research
RESEND_API_KEY=your_key_here      # For email
MONGODB_URI=mongodb+srv://...     # For persistence
```

---

## Quick Reference

| Task | Where |
|------|-------|
| Subscribe to transcription | `UserSession.initialize()` |
| Handle new transcript | `TranscriptManager.handleTranscription()` |
| Run LLM analysis | `AgentManager.runAnalysis()` |
| Start a meeting | `MeetingManager.startMeeting()` |
| Generate notes | `NotesManager.generateNotes()` |
| Do research | `ResearchManager.research()` |
| Show on glasses | `DisplayManager.showText()` |
| Broadcast to UI | `BroadcastManager.emit()` |
| Get user settings | `SettingsManager.getSettings()` |
| Get meeting presets | `SettingsManager.getActivePresets()` |

---

## Summary

1. **Read the docs**: `product-spec.md` for what, `backend-design-doc.md` for how
2. **Follow the phases**: Foundation → Intelligence → Output → Persistence → Polish
3. **Use live-captions as reference**: Especially for MentraOS SDK patterns
4. **Managers communicate via UserSession**: `this.userSession.otherManager.method()`
5. **AgentManager is the brain**: It orchestrates everything based on LLM analysis
6. **Test incrementally**: Each phase should be testable before moving on