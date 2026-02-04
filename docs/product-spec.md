# SEGA Product Specification

**Smart Executive Glasses Assistant**

Version: 1.0 (Hackathon)  
Last Updated: January 31, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Agent Behaviors](#agent-behaviors)
6. [User Interactions](#user-interactions)
7. [Features](#features)
8. [API Endpoints](#api-endpoints)
9. [Hackathon Scope](#hackathon-scope)

---

## Overview

### What is SEGA?

SEGA is an always-on AI assistant for smart glasses that automatically captures, understands, and acts on conversations throughout your day. It's not a chatbot you query—it's a persistent awareness agent that:

- **Listens** to all conversations via continuous transcription
- **Detects** when meetings start and end
- **Classifies** meetings based on user-defined presets
- **Captures** structured notes, decisions, and action items
- **Researches** people, companies, and topics in real-time
- **Respects** privacy by detecting sensitive topics

### Target User

Busy professionals (executives, investors, sales reps, etc.) who have many meetings and need intelligent assistance without manual effort.

### Key Differentiator

SEGA is **proactive, not reactive**. It doesn't wait for commands—it understands context and acts appropriately based on the type of conversation and user preferences.

---

## Core Concepts

### 1. Always-On Transcription

When SEGA is running, it continuously captures audio transcription from the glasses. This forms the foundation of all intelligence—the full transcript history for the day is always available for context.

```
User wakes up → Puts on glasses → SEGA starts capturing
    ↓
All conversations throughout the day are transcribed
    ↓
SEGA maintains full context of everything said
```

### 2. Meeting Detection & Classification

SEGA uses LLM analysis to detect when conversations transition into "meetings" and classifies them against user-defined presets.

**Detection signals:**
- Multiple speakers engaged in structured discussion
- Meeting-like language ("let's get started", "agenda for today")
- Introduction patterns ("I'm Alex from...")
- Topic shifts indicating a new context

**Classification:**
Matches detected meetings against preset rules to determine behavior.

### 3. Meeting Presets

User-configured rules that define how SEGA behaves for different meeting types. Since we don't have calendar integration, **all classification is derived purely from transcript content** using LLM analysis.

Presets are **role-aware** - they consider who the user is and what they need from that type of meeting:

| Preset | User Role | They're Meeting With | Condition (LLM-inferred from transcript) | What They Need |
|--------|-----------|---------------------|------------------------------------------|----------------|
| Investor Pitch | Investor | Founder pitching | Someone pitching their startup, founder intros, traction metrics, fundraising asks, market size claims | Research founder background, company, market, competitors. Capture metrics & claims for verification. |
| External Sales | Sales rep | Prospect/customer | Sales conversation, prospect asking questions, pricing/demo discussion, objection handling | Research prospect company/person. Capture objections, requirements, next steps. |
| Vendor Evaluation | Buyer | Vendor pitching | Vendor presenting their product, feature demos, pricing discussion | Research vendor and competitors. Capture pricing, features, concerns. |
| 1:1 | Manager | Direct report | Two speakers, personal/career topics, feedback, goals discussion | Capture feedback given/received, career goals, action items. No external research. |
| Standup | Team member | Team | Multiple quick updates, blockers, "what did you work on" patterns | Light notes, capture blockers and commitments only. |
| Design Review | Designer/PM | Team | Design terminology, mockups, UI/UX feedback, visual critiques | Capture feedback, decisions, rationale. Research design patterns if mentioned. |
| Interview | Hiring manager | Candidate | Interview questions, candidate background, assessment discussion | Capture impressions and evaluation. No external sharing (sensitive). |

Each preset defines:
- **Condition**: Natural language description for LLM classification (inferred from transcript patterns, language, speaker dynamics)
- **Category**: Label for the meeting type
- **User Context**: Who the user is in this meeting and what's useful for them
- **Note Rules**: What to capture and how detailed
- **Research Triggers**: When to auto-research (people, companies, market, topics)

### 4. Autonomy Levels

User controls how proactive SEGA is:

| Level | Description | Behavior |
|-------|-------------|----------|
| **Capture Only** | Records and summarizes. No outgoing actions. | Passive observation, generates notes but doesn't send anything |
| **Suggest** | Drafts emails and researches. Waits for approval. | Proactive assistance but human-in-the-loop for external actions |
| **Act with Constraints** | Sends internal summaries automatically. Asks for external. | High autonomy for internal, approval needed for external |

### 5. Sensitive Topics

Keywords/topics that trigger automatic privacy protection:
- Layoffs, Acquisition, Salary Review, Legal Dispute, Patent Filing, HR Investigation

**When detected:**
- Automatically enforces "Capture Only" mode
- No external summaries or emails drafted
- Notes are marked as sensitive

### 6. Deep Research

On-demand or automatic research using Firecrawl:
- **Automatic**: Triggered by meeting preset rules (e.g., research external attendees)
- **Explicit**: User says "SEGA, research [topic]"

Research results stream to the UI in real-time and are attached to meeting notes.

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MentraOS (Glasses)                           │
│                  Continuous Audio → Transcription               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SEGA Backend                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Transcript Buffer                        │  │
│  │            (Full day's conversation history)              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                │
│                                ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Awareness Agent                          │  │
│  │  - Tracks state: idle | meeting | post_meeting            │  │
│  │  - Detects meeting boundaries                             │  │
│  │  - Classifies against presets                             │  │
│  │  - Monitors for sensitive topics                          │  │
│  │  - Listens for user commands                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                │
│         ┌──────────────────────┼──────────────────────┐         │
│         ▼                      ▼                      ▼         │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐    │
│  │    Notes    │       │   Actions   │       │  Research   │    │
│  │  Generator  │       │  Extractor  │       │    Agent    │    │
│  └─────────────┘       └─────────────┘       └─────────────┘    │
│         │                      │                      │         │
│         └──────────────────────┼──────────────────────┘         │
│                                ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MongoDB Storage                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         ┌───────────┐   ┌───────────┐   ┌───────────┐
         │  Webview  │   │  Glasses  │   │   Email   │
         │    UI     │   │  Display  │   │  (Resend) │
         └───────────┘   └───────────┘   └───────────┘
```

### Component Responsibilities

#### Transcript Buffer
- Receives continuous transcript stream from MentraOS
- Accumulates segments in memory with timestamps
- Provides context window for LLM analysis
- **Batched persistence**: Flushes to MongoDB every ~5 minutes
- Single document per user per day (DailyTranscript)

#### Awareness Agent
- Core intelligence loop running continuously
- Maintains state machine: `idle` → `meeting_detected` → `meeting_active` → `meeting_ended` → `processing`
- Periodically analyzes recent transcript to detect state transitions
- Applies preset rules for classification
- Monitors for sensitive topics
- Listens for explicit user commands ("SEGA, research X")

#### Notes Generator
- Triggered when meeting ends
- Analyzes full meeting transcript
- Generates structured output based on preset rules:
  - Summary paragraph
  - Key decisions
  - Action items with owners/dates
- Respects autonomy level for what to do with notes

#### Actions Extractor
- Parses notes for action items
- Creates ActionItem entities with:
  - Task description
  - Priority (inferred)
  - Owner (inferred from transcript)
  - Due date (inferred if mentioned)
  - Source meeting reference

#### Research Agent
- Firecrawl-powered deep research
- Triggered automatically (preset rules) or explicitly (user command)
- Streams progress updates to UI
- Attaches results to meeting/notes

---

## Data Models

### DailyTranscript

Transcripts are stored **per-user, per-day** as a single document. Segments are accumulated in memory and flushed to the database every ~5 minutes to reduce write overhead.

**Note:** `userId` is the user's email address, obtained from `AppSession` via MentraOS authentication.

```typescript
interface TranscriptSegment {
  timestamp: Date;
  text: string;
  speakerHint?: string;      // Rough diarization from MentraOS
  speakerLabel?: string;     // LLM-inferred name (e.g., "Alex")
  meetingId?: string;        // Assigned once meeting is detected
  isFinal: boolean;          // Final vs interim transcription
}

interface DailyTranscript {
  id: string;                // e.g., "{userId}_{date}" -> "john@example.com_2026-01-31"
  userId: string;            // User's email from AppSession
  date: string;              // ISO date: "2026-01-31"
  
  segments: TranscriptSegment[];
  
  // Metadata
  totalDuration?: number;    // Calculated from first to last segment
  segmentCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Storage Strategy:**
- In-memory buffer accumulates segments as they arrive
- Flush to MongoDB every 5 minutes (or on app shutdown)
- Single document per user per day keeps queries simple
- `segments` array appended to, not replaced

### Meeting

```typescript
interface Meeting {
  id: string;
  userId: string;            // User's email from AppSession
  date: string;              // ISO date - links to DailyTranscript
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended' | 'processing' | 'complete';
  
  // Classification
  presetId?: string;
  category?: string;         // e.g., "External Sales", "Standup"
  classificationConfidence?: number;
  
  // Flags
  hasSensitiveContent: boolean;
  autonomyLevelOverride?: AutonomyLevel;
  
  // Transcript reference (indexes into DailyTranscript.segments)
  transcriptRange: {
    startIndex: number;      // Index in DailyTranscript.segments
    endIndex: number;
  };
  
  // Relations
  noteId?: string;
  researchIds: string[];
  
  // Metadata
  detectedAttendees: string[];
  topics: string[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Note

```typescript
interface Note {
  id: string;
  userId: string;
  meetingId?: string;
  
  // Time context
  date: Date;
  timeRange?: {
    start: Date;
    end: Date;
  };
  
  // Content
  type: 'ai_generated' | 'manual';
  summary: string;
  keyDecisions: string[];
  rawTranscript?: string;
  
  // Flags
  isSensitive: boolean;
  isStarred: boolean;
  
  // Relations
  actionItemIds: string[];
  researchIds: string[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### ActionItem

```typescript
interface ActionItem {
  id: string;
  userId: string;
  
  // Content
  task: string;
  priority: 'low' | 'medium' | 'high';
  owner: string;              // "You" or name
  dueDate?: Date;
  
  // Status
  status: 'todo' | 'in_progress' | 'done';
  
  // Source traceability
  sourceMeetingId?: string;
  sourceNoteId?: string;
  sourceType: 'ai_extracted' | 'manual';
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### MeetingPreset

```typescript
interface MeetingPreset {
  id: string;
  userId: string;
  
  name: string;               // "External Sales"
  condition: string;          // Natural language: "Attendees include external domains"
  category: string;           // Tag/label
  isActive: boolean;
  
  // Behavior configuration
  noteRules: {
    detailLevel: 'minimal' | 'standard' | 'detailed';
    captureDecisions: boolean;
    captureActionItems: boolean;
    customInstructions?: string;
  };
  
  researchTriggers: {
    autoResearchAttendees: boolean;
    autoResearchCompanies: boolean;
    autoResearchTopics: boolean;
    customTriggers?: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

### SensitiveTopic

```typescript
interface SensitiveTopic {
  id: string;
  userId: string;
  keyword: string;
  isActive: boolean;
  createdAt: Date;
}
```

### UserSettings

```typescript
interface UserSettings {
  userId: string;
  
  // Autonomy
  autonomyLevel: 'capture_only' | 'suggest' | 'act_with_constraints';
  
  // Transcription display
  showTranscriptOnGlasses: boolean;
  
  // Notifications
  emailSummaries: boolean;
  emailAddress?: string;
  
  // Defaults
  defaultPresetId?: string;
  
  updatedAt: Date;
}
```

### ResearchResult

```typescript
interface ResearchResult {
  id: string;
  userId: string;
  
  // Query
  query: string;
  queryType: 'person' | 'company' | 'topic' | 'general';
  
  // Source
  triggerType: 'automatic' | 'explicit';
  meetingId?: string;
  
  // Results
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  results: {
    title: string;
    url: string;
    snippet: string;
    content?: string;
  }[];
  summary?: string;
  
  // Streaming
  progressUpdates: {
    timestamp: Date;
    message: string;
    stage: string;
  }[];
  
  createdAt: Date;
  completedAt?: Date;
}
```

### AppState (Runtime)

```typescript
interface AppState {
  userId: string;
  
  // Recording
  isRecording: boolean;
  recordingStartedAt?: Date;
  
  // Meeting state machine
  meetingState: 'idle' | 'meeting_detected' | 'meeting_active' | 'meeting_ended' | 'processing';
  currentMeetingId?: string;
  
  // Awareness
  lastAnalysisAt?: Date;
  detectedSensitiveTopics: string[];
  effectiveAutonomyLevel: AutonomyLevel;
  
  // Active research
  activeResearchIds: string[];
  
  // Glasses display
  showTranscript: boolean;
  currentGlassesDisplay?: string;
}
```

---

## Agent Behaviors

### Awareness Agent Loop

The awareness agent runs continuously while the app is active:

```
Every N seconds (or on significant transcript activity):
  1. Get recent transcript window (last 2-3 minutes)
  2. Analyze with LLM:
     - Is a meeting happening?
     - If meeting active: has it ended?
     - Any sensitive topics detected?
     - Any user commands to handle?
  3. Update state machine
  4. Trigger appropriate actions
```

### State Machine

```
                    ┌──────────────────┐
                    │                  │
                    ▼                  │
┌─────────┐    ┌─────────────────┐    │    ┌─────────────┐
│  IDLE   │───▶│ MEETING_DETECTED│────┼───▶│   MEETING   │
└─────────┘    └─────────────────┘    │    │   ACTIVE    │
     ▲                                │    └─────────────┘
     │                                │           │
     │                                │           │ Meeting ends
     │                                │           ▼
     │         ┌──────────────────────┘    ┌─────────────┐
     │         │                           │   MEETING   │
     │         │                           │    ENDED    │
     │         │                           └─────────────┘
     │         │                                  │
     │         │                                  │ Generate notes
     │         │                                  ▼
     │         │                           ┌─────────────┐
     │         │                           │ PROCESSING  │
     │         │                           └─────────────┘
     │         │                                  │
     │         │                                  │ Complete
     └─────────┴──────────────────────────────────┘
```

### Meeting Detection Prompt (Conceptual)

```
You are analyzing a conversation transcript to detect if a meeting is occurring.

Current state: {idle | meeting_active}
Recent transcript (last 3 minutes):
{transcript}

Determine:
1. Is this a meeting/structured conversation? (vs casual chat, solo talk, silence)
2. If meeting was active, has it ended? (goodbyes, topic conclusion, silence)
3. What type of meeting does this appear to be?
4. Who are the participants? (names mentioned, roles)
5. Any sensitive topics detected? (from list: {sensitive_topics})

Respond with JSON:
{
  "isMeeting": boolean,
  "meetingEnded": boolean,
  "meetingType": string | null,
  "confidence": number,
  "participants": string[],
  "sensitiveTopicsDetected": string[],
  "reasoning": string
}
```

### Notes Generation Prompt (Conceptual)

```
You are generating structured meeting notes.

Meeting type: {category}
Preset rules: {noteRules}
Full transcript:
{transcript}

Generate:
1. A concise summary paragraph (2-4 sentences)
2. Key decisions made (bulleted list)
3. Action items with:
   - Task description
   - Owner (who is responsible, or "Unassigned")
   - Priority (Low/Medium/High based on urgency/importance)
   - Due date (if mentioned or inferable)

Respond with JSON:
{
  "summary": string,
  "keyDecisions": string[],
  "actionItems": [
    {
      "task": string,
      "owner": string,
      "priority": "low" | "medium" | "high",
      "dueDate": string | null
    }
  ]
}
```

---

## User Interactions

### Voice Commands

| Command | Action |
|---------|--------|
| "SEGA, start recording" | Begin transcription capture |
| "SEGA, stop recording" | Stop transcription capture |
| "SEGA, enable transcripts" | Show live transcript on glasses |
| "SEGA, disable transcripts" | Hide transcript from glasses |
| "SEGA, meeting ended" | Force end current meeting, trigger processing |
| "SEGA, summarize" | Generate summary of recent conversation |
| "SEGA, research [topic]" | Trigger deep research on topic |
| "SEGA, who is [name]?" | Quick lookup / research on person |

### Glasses Display

**Dashboard widget** always shows current SEGA state:
- Recording status (on/off)
- Meeting status (idle/active)
- Research status (if active)

**Transcript mode** (when enabled):
- Shows live transcription on glasses
- Useful for debugging / verification

**Research results** (when available):
- Brief summary displayed on glasses
- Full results in webview

### Webview UI

**Today Page:**
- Current time, system status
- Start/Stop recording button
- Live transcript panel
- Deep intelligence panel (research results)

**Notes Page:**
- Calendar list of entries by day
- Each entry: Transcript | Notes | AI tabs
- Generate AI Summary button
- Manual note input

**Actions Page:**
- List view and Kanban view
- Filter by priority, status, source
- Create manual actions

**Agents Page (Settings):**
- Autonomy level selector
- Meeting classification rules
- Sensitive topics list

---

## Features

### P0 (Must Have for Hackathon)

1. **Continuous Transcription**
   - Receive and buffer transcript from MentraOS
   - Store with timestamps
   - Display in UI

2. **Meeting Detection**
   - LLM-based detection of meeting start/end
   - Basic state machine

3. **Notes Generation**
   - Generate structured summary when meeting ends
   - Extract key decisions
   - Extract action items

4. **Deep Research**
   - Firecrawl integration
   - Explicit trigger via voice/UI
   - Stream results to UI

5. **Basic Presets**
   - Hardcoded initial presets
   - Classification against presets

6. **Email Output**
   - Send notes via Resend
   - Send research results via email

### P1 (Should Have)

1. **Autonomy Levels**
   - Implement all three levels
   - Respect level for actions

2. **Sensitive Topics**
   - Detection and auto-downgrade
   - UI for managing topics

3. **Action Items Management**
   - Full CRUD
   - Status tracking
   - Kanban view

4. **Preset Management**
   - UI for creating/editing presets
   - Custom conditions

5. **Glasses Display Modes**
   - Transcript toggle
   - Status widget

### P2 (Nice to Have)

1. **AI Chat with Notes**
   - Chat interface for asking questions about transcript/notes

2. **Auto-Research**
   - Automatic research based on preset triggers
   - Research during meeting (not just after)

3. **Speaker Identification**
   - LLM-based speaker labeling
   - Learn names over time

4. **Historical Context**
   - Reference past meetings
   - "Follow up from yesterday's standup"

---

## API Endpoints

### Transcription

```
POST /api/transcript/segment
  - Receive transcript segment from MentraOS
  - Buffered in memory, not immediately persisted

POST /api/transcript/flush
  - Force flush transcript buffer to database (internal use)

GET /api/transcript/today
  - Get DailyTranscript for today

GET /api/transcript/:date
  - Get DailyTranscript for specific date (YYYY-MM-DD)

GET /api/transcript/:date/range?start=0&end=100
  - Get specific segment range from a day's transcript
```

### Meetings

```
GET /api/meetings
  - List meetings (with filters)

GET /api/meetings/:id
  - Get meeting details with transcript

POST /api/meetings/:id/end
  - Manually end a meeting

POST /api/meetings/:id/process
  - Trigger notes generation
```

### Notes

```
GET /api/notes
  - List notes (with filters)

GET /api/notes/:id
  - Get note details

POST /api/notes
  - Create manual note

POST /api/notes/:id/generate-summary
  - (Re)generate AI summary

PUT /api/notes/:id
  - Update note

POST /api/notes/:id/email
  - Email note to user
```

### Actions

```
GET /api/actions
  - List action items (with filters)

GET /api/actions/:id
  - Get action item details

POST /api/actions
  - Create manual action

PUT /api/actions/:id
  - Update action (status, priority, etc.)

DELETE /api/actions/:id
  - Delete action
```

### Research

```
POST /api/research
  - Start new research query
  Body: { query: string, type?: string, meetingId?: string }

GET /api/research/:id
  - Get research status and results

GET /api/research/:id/stream
  - SSE stream of research progress
```

### Settings

```
GET /api/settings
  - Get user settings

PUT /api/settings
  - Update user settings

GET /api/presets
  - List meeting presets

POST /api/presets
  - Create preset

PUT /api/presets/:id
  - Update preset

DELETE /api/presets/:id
  - Delete preset

GET /api/sensitive-topics
  - List sensitive topics

POST /api/sensitive-topics
  - Add sensitive topic

DELETE /api/sensitive-topics/:id
  - Remove sensitive topic
```

### State

```
GET /api/state
  - Get current app state (recording, meeting status, etc.)

POST /api/state/recording/start
  - Start recording

POST /api/state/recording/stop
  - Stop recording

POST /api/state/glasses/transcript
  - Toggle transcript display on glasses
  Body: { enabled: boolean }
```

### SSE Events

```
GET /api/events
  - SSE stream for real-time updates

Events:
  - transcript: New transcript segment
  - meeting_detected: Meeting started
  - meeting_ended: Meeting ended
  - notes_ready: Notes generated
  - research_progress: Research update
  - research_complete: Research finished
  - state_change: App state changed
```

---

## Hackathon Scope

### Day 1 Focus
- [ ] Transcript capture and storage working
- [ ] Basic awareness agent loop
- [ ] Meeting detection (start/end)
- [ ] Notes generation on meeting end

### Day 2 Focus
- [ ] Deep research with Firecrawl
- [ ] Email output via Resend
- [ ] Basic presets and classification
- [ ] Voice command handling

### Demo Script
1. Start SEGA, show "Recording" status
2. Have a mock sales meeting conversation
3. SEGA detects meeting, classifies as "External Sales"
4. Meeting ends, SEGA generates notes
5. Show structured notes with decisions and action items
6. Trigger "SEGA, research Acme Corp"
7. Show research streaming to UI
8. Email notes + research to user

### What We're NOT Building
- Google Calendar integration
- Gmail OAuth integration
- Slack integration
- Perfect speaker diarization
- Complex preset rule engine
- Historical cross-meeting intelligence

---

## Appendix

### Example Meeting Presets

```json
[
  {
    "name": "Investor Pitch",
    "condition": "Someone is pitching their startup to the user. Founder introductions, company descriptions, traction metrics (ARR, users, growth), market size claims, fundraising asks, demo of product.",
    "category": "Investor Meeting",
    "userContext": "User is an investor evaluating a potential investment",
    "noteRules": {
      "detailLevel": "detailed",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: founder names/backgrounds, company name, key metrics claimed (ARR, growth, users), market size claims, the ask (amount, valuation), red flags or concerns, questions to follow up on"
    },
    "researchTriggers": {
      "autoResearchAttendees": true,
      "autoResearchCompanies": true,
      "autoResearchTopics": true,
      "customTriggers": ["Research founder's past companies", "Validate market size claims", "Find competitor landscape"]
    }
  },
  {
    "name": "External Sales",
    "condition": "Sales conversation with a prospect or customer. User is selling, prospect asking questions, pricing/demo discussion, objection handling, next steps negotiation.",
    "category": "Sales Call",
    "userContext": "User is a sales rep trying to close a deal",
    "noteRules": {
      "detailLevel": "detailed",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: prospect's requirements, objections raised, competitor mentions, budget/timeline discussed, decision makers identified, agreed next steps"
    },
    "researchTriggers": {
      "autoResearchAttendees": true,
      "autoResearchCompanies": true,
      "autoResearchTopics": false
    }
  },
  {
    "name": "Vendor Evaluation",
    "condition": "A vendor is pitching their product/service to the user. Feature demos, pricing discussion, contract terms, implementation details.",
    "category": "Vendor Meeting",
    "userContext": "User is evaluating a vendor for potential purchase",
    "noteRules": {
      "detailLevel": "detailed",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: pricing quoted, features demonstrated, limitations mentioned, implementation timeline, contract terms, concerns raised"
    },
    "researchTriggers": {
      "autoResearchAttendees": false,
      "autoResearchCompanies": true,
      "autoResearchTopics": true,
      "customTriggers": ["Research competitor alternatives", "Find reviews of vendor"]
    }
  },
  {
    "name": "1:1",
    "condition": "Two distinct speakers only, personal or career discussion, feedback exchange, goals discussion, check-in patterns.",
    "category": "Personnel",
    "userContext": "User is having a private conversation with one other person",
    "noteRules": {
      "detailLevel": "standard",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: feedback given/received, career goals discussed, concerns raised, agreed action items"
    },
    "researchTriggers": {
      "autoResearchAttendees": false,
      "autoResearchCompanies": false,
      "autoResearchTopics": false
    }
  },
  {
    "name": "Standup",
    "condition": "Multiple people giving brief status updates. 'What did you work on', blockers, quick round-robin updates, daily sync patterns.",
    "category": "Standup",
    "userContext": "User is participating in a team sync",
    "noteRules": {
      "detailLevel": "minimal",
      "captureDecisions": false,
      "captureActionItems": true,
      "customInstructions": "Focus only on blockers mentioned and commitments made"
    },
    "researchTriggers": {
      "autoResearchAttendees": false,
      "autoResearchCompanies": false,
      "autoResearchTopics": false
    }
  },
  {
    "name": "Design Review",
    "condition": "Discussion about design, UX, mockups, visual feedback. Design terminology, critique patterns, approval/rejection of ideas.",
    "category": "Design Review",
    "userContext": "User is reviewing or presenting design work",
    "noteRules": {
      "detailLevel": "detailed",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: design feedback given, approved/rejected ideas, rationale for decisions, changes requested"
    },
    "researchTriggers": {
      "autoResearchAttendees": false,
      "autoResearchCompanies": false,
      "autoResearchTopics": true,
      "customTriggers": ["Research design patterns mentioned", "Find examples referenced"]
    }
  },
  {
    "name": "Interview",
    "condition": "Job interview patterns. Candidate introducing background, interview questions, assessment discussion, role/team description.",
    "category": "Interview",
    "userContext": "User is interviewing a candidate",
    "noteRules": {
      "detailLevel": "detailed",
      "captureDecisions": true,
      "captureActionItems": true,
      "customInstructions": "Capture: candidate's background, strengths observed, concerns/red flags, specific answers to key questions, overall impression"
    },
    "researchTriggers": {
      "autoResearchAttendees": true,
      "autoResearchCompanies": false,
      "autoResearchTopics": false
    },
    "sensitive": true,
    "sensitiveReason": "Interview content should not be shared externally"
  }
]
```

### Default Sensitive Topics

```json
[
  "Layoffs",
  "Acquisition", 
  "Salary Review",
  "Legal Dispute",
  "Patent Filing",
  "HR Investigation",
  "Termination",
  "Confidential",
  "NDA",
  "Board Meeting"
]
```
