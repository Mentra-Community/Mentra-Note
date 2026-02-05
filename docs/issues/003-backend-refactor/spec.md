# Backend Refactor

## Problem

Backend code is disorganized with SEGA leftovers:

1. **Models in wrong place** - All mongoose schemas crammed in `services/db/index.ts` (~700 lines)
2. **Deprecated models** - Meeting, ActionItem, ResearchResult, MeetingPreset, SensitiveTopic are unused SEGA remnants
3. **Managers in one file** - `synced/managers.ts` is ~1200 lines with 4 managers
4. **Confusing folder names** - `app/` and `synced/` don't communicate purpose
5. **Chat not per-day** - ChatManager shares history across all days (bug)

## Solution

Restructure backend with clear separation:

```
backend/
├── api/
├── models/
│   ├── index.ts
│   ├── daily-transcript.model.ts
│   ├── hour-summary.model.ts
│   ├── note.model.ts
│   ├── user-settings.model.ts
│   └── chat-history.model.ts       # NEW
├── services/
│   ├── db.ts                       # Connection only
│   └── llm/
├── session/
│   ├── index.ts
│   ├── NotesSession.ts
│   └── managers/
│       ├── index.ts
│       ├── TranscriptManager.ts
│       ├── NotesManager.ts
│       ├── ChatManager.ts
│       └── SettingsManager.ts
└── NotesApp.ts
```

## Changes

### Models
- Create `backend/models/` folder
- Split each model into `*.model.ts` file
- Interfaces named with `I` suffix: `NoteI`, `ChatHistoryI`, etc.
- DELETE deprecated: Meeting, ActionItem, ResearchResult, MeetingPreset, SensitiveTopic
- ADD new: ChatHistory (per-day chat)

### Services
- `services/db/index.ts` → `services/db.ts` (connection only)
- Models no longer in services

### Session (was "synced")
- Rename `synced/` → `session/`
- Split `managers.ts` into `managers/` folder
- Each manager in own file

### App
- Move `app/index.ts` → `NotesApp.ts`
- Delete `app/` folder

### Fix per-day chat
- ChatManager loads/saves chat per date
- New `chat-history.model.ts` stores messages by userId + date

## Acceptance

- [ ] Models in `backend/models/*.model.ts`
- [ ] Deprecated models removed
- [ ] `services/db.ts` is connection-only
- [ ] Managers split into `session/managers/`
- [ ] `synced/` renamed to `session/`
- [ ] `app/` removed, `NotesApp.ts` at backend root
- [ ] Chat history is per-day (switching days clears/loads different history)
- [ ] All imports updated
- [ ] App still runs