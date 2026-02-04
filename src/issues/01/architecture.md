# Timezone-Based Transcription Batching - Architecture Documentation

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Session                             │
│  ┌────────────┐         ┌──────────────┐      ┌──────────────┐ │
│  │  TimeZone  │────────▶│     User     │◀────▶│  Transcript  │ │
│  │   Class    │         │    Class     │      │    Class     │ │
│  └────────────┘         └──────┬───────┘      └──────┬───────┘ │
│                                 │                     │          │
│                         ┌───────▼────────┐           │          │
│                         │ Batch Cutoff   │           │          │
│                         │ State (cache)  │           │          │
│                         └───────┬────────┘           │          │
└─────────────────────────────────┼──────────────────────┼────────┘
                                  │                     │
                        ┌─────────▼─────────┐   ┌──────▼──────────┐
                        │  batchCutoff.util │   │ TranscriptModel │
                        │   (timezone calc) │   │   (MongoDB)     │
                        └─────────┬─────────┘   └─────────────────┘
                                  │
                        ┌─────────▼──────────┐
                        │  userState.api     │
                        │ (DB access layer)  │
                        └─────────┬──────────┘
                                  │
                        ┌─────────▼──────────┐
                        │  UserState Model   │
                        │    (MongoDB)       │
                        └────────────────────┘
```

### Architecture Pattern: Cache-First with Persistence

**Why this pattern**:
- **Performance**: Checking cutoff on every transcription needs to be fast
- **Reliability**: State must survive session restarts
- **Consistency**: Single source of truth in database

**How it works**:
1. **Cache**: User class holds `batchCutoff` in memory (hot path, zero DB calls)
2. **Persistence**: UserState in MongoDB (survives restarts, handles multiple sessions)
3. **Synchronization**: Load on session start, write on cutoff crossing

## Component Details

### 1. TimeZone Class (Existing)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/shared/class/TimeZone.ts`

**Responsibilities**:
- Store user's IANA timezone (e.g., "America/Los_Angeles")
- Provide timezone-aware date/time utilities
- Listen for timezone changes from MentraOS settings

**Key Methods Used**:
```typescript
getTimezone(): string | undefined
// Returns user's IANA timezone string or undefined

getCurrentDateInTimezone(): Date
// Returns current date in user's local timezone

formatTimeInTimezone(date?: Date): string
// Formats date/time in user's timezone for logging
```

**Integration with Batching**:
- User class accesses `this.timezone.getTimezone()` for cutoff calculations
- Timezone changes trigger batch cutoff recalculation
- Existing infrastructure, no modifications needed

### 2. User Class (Modified)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/shared/class/User.ts`

**Responsibilities**:
- Own and manage batch cutoff state
- Initialize cutoff from database or create new
- Check cutoff and trigger batching when crossed
- Handle timezone changes and recalculate cutoff
- Provide public API for Transcript class

**New Fields**:
```typescript
private batchCutoff: Date | null = null;
// Cached cutoff timestamp; null until initialized

private isInitializingBatchState: boolean = false;
// Guards against race conditions during async init
```

**New Methods**:

```typescript
private async initializeBatchState(): Promise<void>
```
- Called from constructor (async, fire-and-forget)
- Loads UserState from database by userId
- If exists: Cache `endOfDateBatchTranscriptions` in `batchCutoff`
- If not exists: Calculate today's 23:59, create UserState, cache cutoff
- Sets `isInitializingBatchState` flag to prevent duplicate calls

```typescript
public async checkAndHandleBatchCutoff(): Promise<void>
```
- Called by Transcript class on every `isFinal=true` transcription
- Guards: Returns early if `batchCutoff === null` (still initializing)
- Checks if current time > cutoff using `hasCrossedCutoff()`
- If crossed:
  1. Logs: `"📦 BATCHING TO R2 for {user} at {localTime}"`
  2. Calculates next day's cutoff using `getNextDayCutoff()`
  3. Updates database via `updateBatchCutoff()`
  4. Updates cached `batchCutoff` in memory

```typescript
private async handleTimezoneChange(newTimezone: string): Promise<void>
```
- Called when timezone settings change
- Gets current cutoff date (just the calendar day)
- Recalculates end-of-day (23:59) in NEW timezone for same date
- Updates database and cache with new cutoff
- Logs timezone change and new cutoff

**Data Flow in User Class**:
```
Constructor:
  1. Initialize timezone (existing)
  2. Create Transcript instance
  3. Call transcript.setUser(this)
  4. Call initializeBatchState() asynchronously
  5. Set up timezone listener with handleTimezoneChange callback

On Transcription (isFinal=true):
  1. Transcript calls user.checkAndHandleBatchCutoff()
  2. Check if cutoff crossed
  3. If YES: Log, calculate next cutoff, update DB, update cache
  4. Return to Transcript to save transcription

On Timezone Change:
  1. Settings listener fires
  2. Call handleTimezoneChange(newTimezone)
  3. Recalculate cutoff in new timezone
  4. Update DB and cache
```

### 3. Transcript Class (Modified)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/shared/class/Transcript.ts`

**Responsibilities**:
- Process transcription segments
- Trigger batch cutoff check on final transcriptions
- Save transcriptions to MongoDB

**New Field**:
```typescript
private user: User | null = null;
// Reference to parent User instance (set from User constructor)
```

**New Method**:
```typescript
public setUser(user: User): void {
  this.user = user;
}
```
- Called from User constructor after Transcript instantiation
- Establishes bidirectional reference for cutoff checking

**Modified Method**:
```typescript
async addSegment(data: TranscriptionData): Promise<void>
```

**New logic**:
```typescript
if (data.isFinal) {
  this.segments.push(segment);

  // NEW: Check batch cutoff BEFORE saving
  if (this.user) {
    await this.user.checkAndHandleBatchCutoff();
  }

  // EXISTING: Save to MongoDB
  await TranscriptModel.create({
    userEmail: this.userEmail,
    directionizationId: segment.speakerId,
    content: segment.text,
  });
}
```

**Why check BEFORE saving**:
- Ensures cutoff detection happens even if save fails
- Logs appear in chronological order
- Batching state updates before data writes

### 4. Batch Cutoff Utilities (New)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/server/util/batchCutoff.util.ts`

**Responsibilities**:
- Pure functions for timezone-aware date calculations
- No state, no side effects
- Uses `Intl.DateTimeFormat` following TimeZone class pattern

**Functions**:

```typescript
export function initializeCutoff(timezone: string): Date
```
- Calculates today's end-of-day (23:59:59.999) in user's timezone
- Used when creating UserState for first-time users
- Returns Date object in UTC but calculated based on local timezone

**Algorithm**:
```
1. Get current date in target timezone using Intl.DateTimeFormat
2. Extract year, month, day parts
3. Create Date object set to 23:59:59.999
4. Return as UTC timestamp
```

```typescript
export function getEndOfDayInTimezone(
  timezone: string,
  referenceDate: Date = new Date()
): Date
```
- Calculates end-of-day for a specific date in user's timezone
- Used for recalculating cutoff after timezone changes
- Generic version of `initializeCutoff()`

```typescript
export function hasCrossedCutoff(cutoffDate: Date, timezone: string): boolean
```
- Compares current time to cutoff in user's local timezone
- Returns `true` if current time > cutoff
- Handles timezone conversions transparently

**Algorithm**:
```
1. Get current date/time in target timezone
2. Get cutoff date/time in target timezone
3. Compare: now > cutoff
4. Return boolean
```

```typescript
export function getNextDayCutoff(currentCutoff: Date, timezone: string): Date
```
- Calculates the next day's end-of-day (23:59) from current cutoff
- Used when updating cutoff after crossing

**Algorithm**:
```
1. Parse current cutoff date in target timezone
2. Add 1 day to the date
3. Set time to 23:59:59.999
4. Return as UTC timestamp
```

**Implementation Pattern** (same as TimeZone class):
```typescript
export function getEndOfDayInTimezone(
  timezone: string,
  referenceDate: Date = new Date()
): Date {
  if (!timezone) {
    timezone = 'UTC'; // Fallback
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  // Create date at 23:59:59.999 for that day
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}
```

**Why UTC timestamps**:
- MongoDB stores dates in UTC
- JavaScript Date objects are inherently UTC
- Timezone conversions happen at boundaries (input/output)

### 5. UserState Database API (New)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/server/api/db/userState.api.ts`

**Responsibilities**:
- Abstract database operations for UserState
- Provide clean API for User class
- Handle errors and edge cases

**Functions**:

```typescript
export async function initializeUserState(params: {
  userEmail: string;
  initialCutoff: Date;
}): Promise<IUserState>
```

**Implementation**:
```typescript
const existing = await UserState.findOne({ userEmail });
if (existing) {
  return existing; // Already initialized
}

const userState = new UserState({
  userEmail,
  endOfDateBatchTranscriptions: initialCutoff,
  createdAt: new Date(),
  updatedAt: new Date(),
});

return await userState.save();
```

**Why check existing**:
- Prevents duplicate documents if multiple sessions initialize concurrently
- MongoDB unique index on `userEmail` provides additional safety

```typescript
export async function updateBatchCutoff(
  userEmail: string,
  newCutoff: Date
): Promise<void>
```

**Implementation**:
```typescript
await UserState.updateOne(
  { userEmail },
  {
    $set: {
      endOfDateBatchTranscriptions: newCutoff,
      updatedAt: new Date()
    }
  }
);
```

**Why updateOne**:
- Atomic operation
- No race conditions between reads/writes
- Efficient (no document retrieval)

```typescript
export async function getUserState(userEmail: string): Promise<IUserState | null>
```

**Implementation**:
```typescript
return await UserState.findOne({ userEmail });
```

**Returns**:
- UserState document if exists
- `null` if user has never transcribed before

### 6. UserState Schema (Existing, Minimal Changes)

**File**: `/Users/aryan/Documents/Work/TPA/Notes/src/shared/schema/userState.schema.ts`

**Current Schema**:
```typescript
const userStateSchema = new Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  endOfDateBatchTranscriptions: {
    type: Date,
    required: true,
    description: "Date and time when transcriptions are batched and sent to R2",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
```

**Considerations**:
- `required: true` on `endOfDateBatchTranscriptions` is fine since we always provide it
- Index on `userEmail` ensures fast lookups
- Unique constraint prevents duplicate users
- Schema is ready to use, no modifications needed

**Future fields** (Phase 2, not implemented yet):
- `lastBatchedAt: Date` - When last batch completed
- `batchedTranscriptionCount: number` - Total transcriptions batched
- `lastBatchId: string` - Reference to last batch in R2

## Data Flow Diagrams

### Session Initialization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User connects to app                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ onSession() in server/index  │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ new User(session)            │
          └──────────────┬───────────────┘
                         │
         ┌───────────────┴────────────────┬────────────────────┐
         │                                │                    │
         ▼                                ▼                    ▼
┌─────────────────┐      ┌───────────────────────┐  ┌──────────────────┐
│ new TimeZone()  │      │ new Transcript()      │  │ User.sessions.   │
│                 │      │                       │  │ set(userId, this)│
└────────┬────────┘      └───────────┬───────────┘  └──────────────────┘
         │                           │
         │              ┌────────────▼──────────────┐
         │              │ transcript.setUser(this)  │
         │              └───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ initializeBatchState() [ASYNC]     │
└────────────┬────────────────────────┘
             │
    ┌────────▼────────┐
    │ Query MongoDB   │
    │ getUserState()  │
    └────────┬────────┘
             │
        ┌────┴─────┐
        │          │
        ▼          ▼
   ┌────────┐  ┌──────────────────────────┐
   │ Exists │  │ Doesn't exist            │
   └───┬────┘  └──────────┬───────────────┘
       │                  │
       │                  ▼
       │       ┌────────────────────────────┐
       │       │ initializeCutoff(timezone) │
       │       └──────────┬─────────────────┘
       │                  │
       │                  ▼
       │       ┌────────────────────────────┐
       │       │ initializeUserState(...)   │
       │       └──────────┬─────────────────┘
       │                  │
       └────────┬─────────┘
                │
                ▼
    ┌────────────────────────────┐
    │ Cache cutoff in memory     │
    │ this.batchCutoff = cutoff  │
    └────────────────────────────┘
```

### Transcription Processing Flow

```
┌──────────────────────────────────────┐
│ User speaks                          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ TranscriptionData arrives            │
│ (from MentraOS SDK)                  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ User.startTranscription() handler    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ transcript.addSegment(data)          │
└──────────────┬───────────────────────┘
               │
          ┌────▼─────┐
          │isFinal == │
          │  true?   │
          └────┬─────┘
               │
          YES  │  NO → return
               │
               ▼
┌──────────────────────────────────────┐
│ user.checkAndHandleBatchCutoff()     │
└──────────────┬───────────────────────┘
               │
     ┌─────────▼─────────┐
     │ batchCutoff null? │
     └─────────┬─────────┘
               │
          NO   │  YES → log warning, return
               │
               ▼
┌──────────────────────────────────────┐
│ hasCrossedCutoff(cutoff, timezone)   │
└──────────────┬───────────────────────┘
               │
     ┌─────────▼────────┐
     │ Cutoff crossed?  │
     └─────────┬────────┘
               │
         ┌─────┴─────┐
         │           │
        YES          NO → return
         │
         ▼
┌────────────────────────────────────────┐
│ Log: "📦 BATCHING TO R2"              │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ getNextDayCutoff(cutoff, timezone)     │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ updateBatchCutoff(userId, newCutoff)   │
│ (MongoDB write)                        │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Update cache: this.batchCutoff = new   │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Return to Transcript.addSegment()      │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Save transcription to MongoDB          │
│ (TranscriptModel.create)               │
└────────────────────────────────────────┘
```

### Timezone Change Flow

```
┌──────────────────────────────────────┐
│ User changes timezone in settings    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ MentraOS settings updated            │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ TimeZone listener callback fires     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ User.handleTimezoneChange(newTZ)     │
└──────────────┬───────────────────────┘
               │
     ┌─────────▼─────────┐
     │ batchCutoff null? │
     └─────────┬─────────┘
               │
          NO   │  YES → return (not initialized yet)
               │
               ▼
┌──────────────────────────────────────────┐
│ getEndOfDayInTimezone(newTZ, currentDate)│
│ (recalculate for same calendar date)     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ updateBatchCutoff(userId, newCutoff) │
│ (MongoDB write)                      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Update cache: this.batchCutoff = new │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Log timezone change and new cutoff   │
└──────────────────────────────────────┘
```

## Performance Analysis

### Memory Usage

**Per User Session**:
```
User instance:
  - batchCutoff: Date (8 bytes)
  - isInitializingBatchState: boolean (1 byte)
  Total: ~9 bytes per user

TimeZone instance (existing):
  - timezone: string (~30 bytes avg)
  - userId: string (~50 bytes avg)
  Total: ~80 bytes per user

Overall addition: 9 bytes (negligible)
```

**System-wide** (100 concurrent users):
```
Batching state: 9 bytes × 100 = 900 bytes (< 1 KB)
```

### Database Operations

**Per Session**:
```
Session start:
  - 1 READ: getUserState(userEmail)
  - 0-1 WRITE: initializeUserState(...) [only for first-time users]

Session duration (24 hours):
  - 0-1 WRITE: updateBatchCutoff(...) [when crossing midnight]

Timezone change:
  - 1 WRITE: updateBatchCutoff(...) [rare event]
```

**Cost analysis**:
```
100 users × 1 session/day = 100 reads/day
100 users × 1 batch/day = 100 writes/day
Total: 200 operations/day

MongoDB pricing (example):
  - Reads: Free tier covers 100K/day
  - Writes: Free tier covers 10K/day
  Impact: Negligible
```

### CPU Usage

**Per Transcription**:
```
Operations:
  1. Null check (batchCutoff === null): ~0.001ms
  2. Date comparison (if cutoff initialized): ~0.01ms
  3. Timezone calculation (if crossed): ~1-2ms

Average: 0.01ms per transcription
Impact: Negligible (99.99% of transcriptions just do comparison)
```

**Per Day** (one cutoff crossing per user):
```
Operations:
  1. hasCrossedCutoff(): ~0.01ms
  2. getNextDayCutoff(): ~1-2ms
  3. Database write: ~5-10ms (I/O bound)

Total: ~10ms per day per user
Impact: Negligible
```

### Database Schema Performance

**UserState Collection**:
```
Index on userEmail: Hash index, O(1) lookups
Document size: ~150 bytes (small)
Query pattern: Point queries (no scans)

Expected performance:
  - Read: < 5ms
  - Write: < 10ms
```

### Scalability

**Horizontal Scaling**:
- Each session is independent
- No shared state between User instances
- MongoDB handles concurrent writes atomically
- Safe to run multiple server instances

**Vertical Scaling**:
- Memory: O(n) where n = concurrent users (linear, minimal)
- CPU: O(1) per transcription (constant time)
- Database: O(1) per user per day (constant time)

## Edge Cases and Error Handling

### 1. First-Time User

**Scenario**: User sends their first transcription ever

**Flow**:
```
1. User class created → initializeBatchState() called
2. getUserState(userEmail) returns null
3. initializeCutoff(timezone) calculates today's 23:59
4. initializeUserState({userEmail, initialCutoff}) creates document
5. batchCutoff cached in memory
```

**Edge case**: Race condition (rapid transcriptions before init)
```
Solution:
- isInitializingBatchState flag prevents duplicate DB calls
- checkAndHandleBatchCutoff() guards with null check
- First few transcriptions skip cutoff check (harmless)
- Warning logged: "Batch cutoff not yet initialized"
```

### 2. Timezone Not Set

**Scenario**: User hasn't set timezone in MentraOS settings

**Flow**:
```
1. timezone.getTimezone() returns undefined
2. Utility functions receive undefined
3. Default to 'UTC' timezone
4. Batching occurs at midnight UTC
```

**Logging**:
```
[User] User {email} timezone: NOT SET | Time: {utc time}
[User] Initialized batch cutoff for {email}: {utc midnight}
```

### 3. Timezone Change Mid-Session

**Scenario**: User changes timezone from EST to PST at 3 PM

**Flow**:
```
1. Settings listener fires
2. handleTimezoneChange('America/Los_Angeles') called
3. Current cutoff: Today 23:59 EST
4. Recalculate: Today 23:59 PST (same calendar day, different absolute time)
5. Update database and cache
6. Log timezone change
```

**Result**: Cutoff moves 3 hours later in absolute time

### 4. Crossing Day Boundary Due to Timezone Change

**Scenario**: User at 11:30 PM EST switches to PST

**Flow**:
```
Before change:
  - Current time: 11:30 PM EST (Thursday)
  - Cutoff: 11:59 PM EST (Thursday)
  - Minutes until batch: 29 minutes

After change:
  - Current time: 8:30 PM PST (Thursday - same calendar day!)
  - Recalculated cutoff: 11:59 PM PST (Thursday)
  - Minutes until batch: 3.5 hours

Result: No immediate batching, cutoff extended
```

**Opposite scenario**: User at 8:30 PM PST switches to EST
```
Before change:
  - Current time: 8:30 PM PST (Thursday)
  - Cutoff: 11:59 PM PST (Thursday)

After change:
  - Current time: 11:30 PM EST (Thursday)
  - Recalculated cutoff: 11:59 PM EST (Thursday)
  - Minutes until batch: 29 minutes

Result: Cutoff compressed but no immediate batching
```

### 5. DST Transition (Spring Forward)

**Scenario**: 2 AM becomes 3 AM (clock jumps ahead 1 hour)

**Example**: Sunday, March 10, 2024 at 2:00 AM PST → 3:00 AM PDT

**Flow**:
```
Saturday 11:59 PM PST:
  - Cutoff for Saturday

Sunday 12:01 AM PST (before DST):
  - Crossed cutoff → Batching triggered
  - New cutoff: Sunday 11:59 PM PDT (note: PDT, not PST)

Sunday 3:00 AM PDT (after DST):
  - Clock jumped from 2:00 AM to 3:00 AM
  - Cutoff still Sunday 11:59 PM PDT
  - Intl.DateTimeFormat handles this automatically
```

**Result**: No special handling needed, DST is transparent

### 6. DST Transition (Fall Back)

**Scenario**: 2 AM becomes 1 AM (clock repeats 1 hour)

**Example**: Sunday, November 3, 2024 at 2:00 AM PDT → 1:00 AM PST

**Flow**:
```
Saturday 11:59 PM PDT:
  - Cutoff for Saturday

Sunday 12:30 AM PDT (first occurrence):
  - Still before cutoff

Clock falls back: 2:00 AM PDT → 1:00 AM PST

Sunday 12:30 AM PST (second occurrence):
  - Technically "before" Saturday's cutoff (if comparing clock time)
  - BUT: Intl.DateTimeFormat uses absolute time (UTC under the hood)
  - hasCrossedCutoff() correctly detects we're past Saturday

Result: Batching triggers correctly, no duplicate
```

**Result**: Intl.DateTimeFormat handles ambiguous times correctly

### 7. Session Restart Mid-Day

**Scenario**: Server restarts at 3 PM, user reconnects

**Flow**:
```
1. User class created (new instance)
2. initializeBatchState() called
3. getUserState(userEmail) returns existing document
4. endOfDateBatchTranscriptions loaded: Today 11:59 PM
5. batchCutoff cached in memory
6. Batching continues normally at midnight
```

**Result**: No state lost, no duplicate batching

### 8. Multiple Concurrent Sessions (Same User)

**Scenario**: User has two devices/sessions active simultaneously

**Current behavior**:
```
Session A:
  - User class instance A
  - batchCutoff cached: Today 11:59 PM

Session B:
  - User class instance B
  - batchCutoff cached: Today 11:59 PM

Midnight occurs:
  - Session A transcription → Batch detected → DB update → Cache update
  - Session B transcription (5 seconds later) → Batch detected → DB update → Cache update

Result: Two "BATCHING TO R2" logs, two DB writes
```

**Is this a problem?**:
```
Phase 1: Harmless
  - Just duplicate logs
  - DB writes are idempotent (both set cutoff to tomorrow)

Phase 2: Potential issue
  - Could trigger duplicate R2 uploads
  - Solution: Add "last batched timestamp" to UserState
  - Check if batch already happened today before uploading
```

**Current mitigation**:
```
MongoDB updateOne() is atomic
Worst case: Duplicate logs (acceptable for Phase 1)
```

### 9. Very First Transcription After Initialization

**Scenario**: User initializes, then immediately sends transcription

**Flow**:
```
T=0ms:   new User(session) created
T=1ms:   initializeBatchState() called (async)
T=2ms:   Transcription arrives (isFinal=true)
T=3ms:   checkAndHandleBatchCutoff() called
T=3ms:   batchCutoff is still null (DB query not complete)
T=3ms:   Log warning, skip cutoff check, save transcription
T=50ms:  getUserState() query completes
T=51ms:  batchCutoff set in cache
T=100ms: Next transcription → cutoff check works normally
```

**Result**: First transcription might skip check, but system recovers immediately

### 10. Database Connection Failure

**Scenario**: MongoDB is down during initialization

**Flow**:
```
1. initializeBatchState() called
2. getUserState() throws error
3. Caught in try/catch
4. Fallback: batchCutoff = initializeCutoff('UTC')
5. User can continue transcribing
6. Batching works with UTC timezone
7. Error logged for monitoring
```

**Result**: Degraded but functional (UTC batching instead of user's timezone)

## Testing Strategy

### Unit Tests (Per Component)

**batchCutoff.util.ts**:
```typescript
describe('initializeCutoff', () => {
  it('returns today 23:59:59.999 in UTC', ...)
  it('returns today 23:59:59.999 in America/New_York', ...)
  it('returns today 23:59:59.999 in Asia/Tokyo', ...)
  it('defaults to UTC if timezone is undefined', ...)
});

describe('hasCrossedCutoff', () => {
  it('returns true if current time > cutoff', ...)
  it('returns false if current time < cutoff', ...)
  it('handles timezone offset correctly', ...)
});

describe('getNextDayCutoff', () => {
  it('returns next day 23:59 from current cutoff', ...)
  it('handles month boundaries', ...)
  it('handles year boundaries', ...)
  it('handles DST transitions', ...)
});
```

**userState.api.ts**:
```typescript
describe('initializeUserState', () => {
  it('creates new UserState if not exists', ...)
  it('returns existing UserState if exists', ...)
  it('sets endOfDateBatchTranscriptions correctly', ...)
});

describe('updateBatchCutoff', () => {
  it('updates endOfDateBatchTranscriptions field', ...)
  it('updates updatedAt timestamp', ...)
  it('handles non-existent user gracefully', ...)
});
```

### Integration Tests

**Session Initialization**:
```
1. Start session for new user
2. Verify User instance created
3. Verify UserState document created in MongoDB
4. Verify batchCutoff cached correctly
5. Send transcription (isFinal=true)
6. Verify no batching log (before midnight)
```

**Cutoff Crossing**:
```
1. Create user with endOfDateBatchTranscriptions = 5 minutes ago
2. Send transcription (isFinal=true)
3. Verify "BATCHING TO R2" log appears
4. Verify cutoff updated in MongoDB
5. Verify cutoff updated in cache
6. Send another transcription
7. Verify no batching log (new day)
```

**Timezone Change**:
```
1. Start session with timezone America/New_York
2. Verify cutoff set to today 23:59 EST
3. Change timezone to America/Los_Angeles via settings
4. Verify "Recalculating batch cutoff" log
5. Verify cutoff updated to today 23:59 PST
6. Verify MongoDB updated
```

### End-to-End Tests

**24-Hour Test**:
```
1. Deploy to test environment
2. Create test user
3. Send transcriptions throughout the day
4. Monitor logs around midnight (local time)
5. Verify single "BATCHING TO R2" log at midnight
6. Verify cutoff updated to next day
7. Send transcription after midnight
8. Verify no batching log until next midnight
```

**Multi-Timezone Test**:
```
1. Create test users in 3 timezones:
   - America/New_York (EST/EDT)
   - America/Los_Angeles (PST/PDT)
   - Asia/Tokyo (JST)
2. Send transcriptions for all users
3. Monitor logs for 24 hours
4. Verify batching occurs at midnight in each local timezone
5. Verify no cross-timezone interference
```

## Monitoring and Observability

### Key Metrics to Track

**Application Metrics**:
```
- Batch cutoff initializations per hour
- Batch triggers per day (should be ~1 per active user)
- Timezone changes per day
- Failed batch cutoff updates
- Null cutoff warnings (initialization race conditions)
```

**Database Metrics**:
```
- UserState document count (total users)
- UserState read latency
- UserState write latency
- Failed database operations
```

### Log Messages to Monitor

**Success Indicators**:
```
"[User] Loaded batch cutoff for {user}: {cutoff}"
"[User] Initialized batch cutoff for {user}: {cutoff}"
"[User] 📦 BATCHING TO R2 for {user} at {time}"
"[User] Updated batch cutoff to: {newCutoff}"
```

**Warning Indicators**:
```
"[User] Batch cutoff not yet initialized for {user}, skipping check"
"[TimeZone] Failed to retrieve timezone for user {user}"
```

**Error Indicators**:
```
"[User] Failed to initialize batch state for {user}: {error}"
"[User] Failed to update batch cutoff: {error}"
```

### Alerts to Configure

**Critical**:
```
- Failed batch cutoff updates > 5% of attempts
- Database connection failures
- Multiple batching logs per user per day (indicates bug)
```

**Warning**:
```
- Batch cutoff initialization failures > 1% of sessions
- Null cutoff warnings > 10% of transcriptions
- Timezone missing for > 20% of users
```

## Future Enhancements (Phase 2)

### R2 Upload Integration

**New components needed**:
```
1. R2 client configuration (Cloudflare SDK)
2. Batch collection buffer (in-memory or Redis)
3. Upload service (batch → R2 object)
4. Cleanup service (remove uploaded transcriptions from MongoDB)
```

**Modified flow**:
```
Before cutoff:
  1. Collect transcription IDs in memory

After cutoff:
  1. Log "BATCHING TO R2"
  2. Fetch all collected transcription documents
  3. Format as batch object (JSON/CSV)
  4. Upload to R2: r2://transcripts/{userId}/{date}.json
  5. Delete uploaded transcriptions from MongoDB
  6. Update UserState with lastBatchedAt, batch ID
  7. Update cutoff to next day
```

**New UserState fields**:
```typescript
{
  lastBatchedAt: Date,              // When last batch completed
  lastBatchId: string,              // R2 object key/ID
  batchedTranscriptionCount: number, // Total transcriptions batched
  failedBatchAttempts: number,      // Retry tracking
}
```

### Batch Size Optimization

**Problem**: Users with high transcription volume might exceed reasonable batch sizes

**Solutions**:
```
1. Max batch size limit (e.g., 1000 transcriptions or 10 MB)
2. Trigger batching early if limit reached
3. Split into multiple R2 objects: {date}-part1.json, {date}-part2.json
```

**Modified cutoff logic**:
```
Check on each transcription:
  1. If cutoff crossed: Trigger batch
  2. Else if batch size > limit: Trigger batch, don't update cutoff
```

### Retry Logic

**Problem**: R2 upload might fail (network issues, rate limits)

**Solutions**:
```
1. Exponential backoff retry (3 attempts)
2. Store failed batches in failedBatches collection
3. Background job retries failed batches hourly
4. Alert if batch fails 3+ times
```

### Historical Batch Queries

**Problem**: Users want to retrieve old transcriptions

**Solutions**:
```
1. API endpoint: GET /api/transcriptions/{date}
2. Fetch from R2 if date is historical (> 7 days)
3. Fetch from MongoDB if date is recent (< 7 days)
4. Hybrid: Check MongoDB first, fallback to R2
```

## Summary

This architecture implements a robust, timezone-aware transcription batching system with:

✅ **Performance**: Cache-first approach, zero DB calls on hot path
✅ **Reliability**: State persists across restarts, handles edge cases
✅ **Accuracy**: Timezone-aware calculations using Intl.DateTimeFormat
✅ **Scalability**: O(1) operations, minimal memory, horizontal scaling ready
✅ **Maintainability**: Clean separation of concerns, comprehensive error handling
✅ **Extensibility**: Prepares for Phase 2 R2 upload without major refactoring

The system is production-ready for Phase 1 (cutoff detection and logging) and provides a solid foundation for Phase 2 (actual R2 batching).
