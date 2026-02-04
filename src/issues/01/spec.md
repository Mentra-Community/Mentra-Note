# Timezone-Based Transcription Batching - Feature Specification

## Overview

The transcription batching system automatically tracks when to batch user transcriptions based on their local timezone. Each day at 23:59 (11:59 PM) in the user's local time, the system triggers a batching event that will eventually upload transcriptions to R2 Cloudflare storage.

## User-Facing Behavior

### Daily Batching Schedule

**What happens**: The system monitors transcriptions and batches them at the end of each day in the user's local timezone.

**When it happens**:
- Cutoff time: **23:59:59** (11:59 PM and 59 seconds) in the user's local timezone
- The first transcription after this cutoff triggers the batch event
- After batching, the system automatically sets the next cutoff to the following day's 23:59

**Example Timeline** (User in America/Los_Angeles timezone):
```
Monday 11:58 PM PST  → Transcription saved normally
Monday 11:59 PM PST  → Transcription saved normally
Tuesday 12:01 AM PST → Batching triggered! (crossed Monday's cutoff)
                     → Cutoff updated to Tuesday 23:59 PM PST
Tuesday 9:00 AM PST  → Transcription saved normally
Tuesday 11:30 PM PST → Transcription saved normally
Wednesday 12:05 AM PST → Batching triggered! (crossed Tuesday's cutoff)
```

### User Timezone Handling

**How timezone is determined**:
1. The system uses the user's timezone setting from MentraOS settings
2. This timezone is automatically synchronized from the user's phone/glasses
3. Setting key: `userTimezone` (IANA timezone format, e.g., "America/Los_Angeles")

**What timezone affects**:
- The exact time when batching occurs
- A user in New York will batch at midnight EST/EDT
- A user in Los Angeles will batch at midnight PST/PDT (3 hours later in absolute time)

**Timezone changes**:
- If a user changes their timezone setting mid-day, the system recalculates the cutoff
- The batching still happens at the end of the current calendar day in the NEW timezone
- Example: User at 2 PM EST switches to PST → cutoff becomes same day at 11:59 PM PST

### First-Time User Behavior

**First transcription ever**:
1. User sends their first transcription with the app
2. System automatically initializes batching for that user
3. Cutoff is set to today's 23:59 in the user's timezone
4. User won't see any batching until after midnight (local time)

**Database initialization**:
- A `UserState` document is created in MongoDB
- Stores the user's email and current batch cutoff timestamp
- Persists across sessions and app restarts

### What Gets Batched

**Currently in Phase 1**:
- The system only DETECTS when the cutoff is crossed
- Logs a message: `"📦 BATCHING TO R2"` to the console
- Does NOT yet upload anything to R2 storage
- Transcriptions continue to save to MongoDB as normal

**Future Phase 2** (not yet implemented):
- Collect all transcriptions between cutoffs
- Upload batched transcriptions to R2 Cloudflare storage
- Remove uploaded transcriptions from MongoDB (optional)
- Provide batch status tracking

## Technical Behavior

### Transcription Flow

**Normal transcription** (before cutoff):
1. User speaks → Transcription data arrives
2. When `isFinal=true` (transcription complete):
   - System checks if current time > batch cutoff
   - If NO: Save transcription to MongoDB normally
   - If YES: Continue to batching flow

**Batching transcription** (after cutoff):
1. System detects cutoff was crossed
2. Logs: `"📦 BATCHING TO R2 for {user} at {localTime}"`
3. Updates cutoff to next day's 23:59 in user's timezone
4. Saves the current transcription to MongoDB normally

### Data Storage

**UserState Schema** (MongoDB):
```typescript
{
  userEmail: string              // User's email identifier (indexed)
  endOfDateBatchTranscriptions: Date  // Next batch cutoff timestamp
  createdAt: Date                // When UserState was created
  updatedAt: Date                // Last update timestamp
}
```

**Purpose**:
- Tracks when each user's next batching should occur
- Persists across sessions and server restarts
- One document per user

### Performance Characteristics

**Memory usage**:
- One Date object cached per active user session (~8 bytes)
- No accumulation of transcriptions in memory (yet)

**Database usage**:
- **Read**: Once per session start (when user connects)
- **Write**: Once per day at midnight (when cutoff is crossed)
- **Write**: When user changes timezone (rare)

**CPU usage**:
- Negligible - one timezone calculation per day per user
- One comparison operation per final transcription

## Edge Cases

### Timezone Changes

**Mid-session timezone change**:
```
User at 3 PM EST (timezone: America/New_York)
  ↓ Cutoff: Today 23:59 EST
User changes timezone to PST (America/Los_Angeles)
  ↓ System recalculates
  ↓ Cutoff: Today 23:59 PST (3 hours later in absolute time)
```

**Crossing day boundary due to timezone change**:
```
User at 11:30 PM EST switches to PST
  → Now 8:30 PM PST (still same calendar day in PST)
  → Cutoff updates to today's 23:59 PST
  → No immediate batching
```

### Session Restart

**User disconnects and reconnects**:
1. Session starts → User class loads UserState from MongoDB
2. Batch cutoff is restored from database
3. Batching continues from correct point
4. No lost state or duplicate batching

### Rapid Transcriptions

**Transcription before initialization completes**:
- System guards against null cutoff
- Transcription saves normally
- Cutoff check skipped for that transcription only
- Warning logged: `"Batch cutoff not yet initialized, skipping check"`

### Daylight Saving Time (DST)

**How DST is handled**:
- System uses `Intl.DateTimeFormat` which automatically handles DST
- Cutoff always represents 23:59 in LOCAL time (clock time)
- DST transitions don't affect batching logic

**Example** (Spring forward):
```
Saturday 11:59 PM PST  → Cutoff
Sunday 12:01 AM PDT    → Batching triggered (clock jumped ahead 1 hour)
                       → Next cutoff: Sunday 23:59 PM PDT
```

### No Timezone Set

**User without timezone**:
- System defaults to UTC timezone
- Batching occurs at midnight UTC
- Warning logged about missing timezone
- Transcriptions still function normally

## User Impact

### What users will notice:
- Nothing! The batching happens automatically in the background
- Transcriptions continue to work exactly as before
- No UI changes or user interaction required

### What users won't notice:
- The specific time batching occurs (happens after midnight when asleep)
- Database operations (fast and efficient)
- Log messages (internal/developer-facing only)

### Future benefits (Phase 2):
- Faster transcription queries (data in optimized R2 storage)
- Lower MongoDB costs (less data stored)
- Better data organization (daily batches)
- Potential for historical transcript downloads

## Success Metrics

**Phase 1 Success Criteria**:
- ✅ Cutoff detection works for all timezones
- ✅ Batching log appears once per day per user
- ✅ No performance degradation
- ✅ No lost transcriptions
- ✅ Timezone changes handled gracefully
- ✅ System works for users without timezone (UTC fallback)

**How to verify**:
1. Check logs for `"📦 BATCHING TO R2"` messages
2. Verify timing matches user's local midnight
3. Check MongoDB for UserState documents with correct cutoffs
4. Test timezone changes and verify recalculation
5. Monitor for 24+ hours to ensure daily batching

## Future Enhancements (Phase 2)

**Not included in current implementation**:
- Actual R2 upload functionality
- Transcription collection between cutoffs
- Batch size limits or optimization
- Batch status tracking
- Historical batch queries
- Batch failure retry logic
- User-configurable batch times

**Current implementation prepares for these by**:
- Establishing cutoff detection infrastructure
- Creating database schema for batch tracking
- Implementing timezone-aware calculations
- Handling edge cases and state persistence
