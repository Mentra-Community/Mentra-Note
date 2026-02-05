# Backend Refactor - Design

## Decisions

- **Interfaces end with `I`**: `NoteI`, `ChatHistoryI`, `DailyTranscriptI`, etc. Consistent with codebase convention.

- **Model files use kebab-case with `.model.ts` suffix**: `daily-transcript.model.ts`, `chat-history.model.ts`. Clear distinction from other files.

- **Each model file exports**: Interface, Schema, Model, and related helper functions. Keeps related code together.

- **`synced/` → `session/`**: "Session" better describes what it is - user session management with synced state.

- **`app/` → `NotesApp.ts`**: Single file doesn't need a folder. Clearer at backend root.

- **Delete deprecated SEGA models**: Meeting, ActionItem, ResearchResult, MeetingPreset, SensitiveTopic are not used anywhere. Dead code.

- **ChatHistory model**: Store messages per userId + date. Enables per-day chat isolation.

## Changes

### New Files
- `backend/models/index.ts` - Re-exports all models
- `backend/models/daily-transcript.model.ts` - DailyTranscriptI, schema, model, helpers
- `backend/models/hour-summary.model.ts` - HourSummaryI, schema, model, helpers
- `backend/models/note.model.ts` - NoteI, schema, model, helpers
- `backend/models/user-settings.model.ts` - UserSettingsI, schema, model, helpers
- `backend/models/chat-history.model.ts` - ChatHistoryI, schema, model, helpers (NEW)
- `backend/services/db.ts` - Connection management only
- `backend/session/index.ts` - Exports NotesSession + sessions
- `backend/session/NotesSession.ts` - Session class (was synced/session.ts)
- `backend/session/managers/index.ts` - Re-exports all managers
- `backend/session/managers/TranscriptManager.ts`
- `backend/session/managers/NotesManager.ts`
- `backend/session/managers/ChatManager.ts` - Updated for per-day chat
- `backend/session/managers/SettingsManager.ts`
- `backend/NotesApp.ts` - Main app class (was app/index.ts)

### Deleted Files
- `backend/services/db/index.ts` - Replaced by models/ + services/db.ts
- `backend/synced/managers.ts` - Split into session/managers/
- `backend/synced/session.ts` - Moved to session/NotesSession.ts
- `backend/app/index.ts` - Moved to NotesApp.ts
- `backend/app/` - Folder removed
- `backend/synced/` - Folder removed

### Modified Files
- `backend/api/router.ts` - Update imports
- `src/index.ts` - Update import for NotesApp

## Notes

- Run app after each major step to catch import errors early
- ChatManager needs `loadDateChat(date)` RPC method for frontend to call when day changes
- Frontend AITab may need update to call `loadDateChat` when date prop changes