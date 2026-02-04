# R2 Batched Transcription Upload - Feature Specification

## Overview

This feature implements the actual upload of batched transcriptions to Cloudflare R2 storage. Building on Issue 01's batch detection system, this adds the full upload pipeline: querying transcriptions from MongoDB, formatting them as JSON, uploading to R2, and cleaning up the database.

**Key Capability**: Automatically moves user transcriptions from MongoDB to cost-effective R2 object storage at the end of each day in the user's local timezone, with intelligent handling of multi-day backlogs.

## User-Facing Behavior

### Daily Batching Upload

**What happens**: After detecting that the batch cutoff has been crossed (from Issue 01), the system uploads all unbatched transcriptions to R2 storage and removes them from MongoDB.

**When it happens**:
- Cutoff detection: **23:59:59** in user's local timezone (already implemented in Issue 01)
- First transcription after cutoff triggers both detection AND upload
- Upload happens in the background, transparent to user
- Transcription continues normally while upload processes

**Example Timeline** (User in America/Los_Angeles timezone):
```
Monday 11:58 PM PST  → Transcription saved to MongoDB
Monday 11:59 PM PST  → Transcription saved to MongoDB
Tuesday 12:01 AM PST → Cutoff crossed!
                     → Query all Monday's transcriptions from MongoDB
                     → Upload to R2: transcriptions/user@email.com/2026-02-03/transcription.json
                     → Delete Monday's transcriptions from MongoDB
                     → Update cutoff to Tuesday 23:59 PM PST
                     → Current transcription saved to MongoDB
Tuesday 9:00 AM PST  → Transcription saved to MongoDB
```

### Multi-Day Backlog Handling

**Critical Feature**: Users may not use the app every day, resulting in multi-day backlogs.

**How it works**:
- Transcriptions accumulate in MongoDB while user is away
- When user returns and crosses cutoff, system batches ALL pending transcriptions
- Transcriptions are grouped by their **creation date** (from `createdAt` field)
- Separate R2 files created for each date
- All files uploaded, then MongoDB cleaned up

**Example Timeline** (User offline for 3 days):
```
Monday Feb 1:
  10:00 AM → Transcription saved to MongoDB (date: 2026-02-01)
  2:00 PM  → Transcription saved to MongoDB (date: 2026-02-01)

Tuesday Feb 2:
  (User offline, no transcriptions)

Wednesday Feb 3:
  11:00 AM → Transcription saved to MongoDB (date: 2026-02-03)

Thursday Feb 4:
  12:01 AM → User returns! Cutoff crossed!
           → System finds unbatched transcriptions from Feb 1 and Feb 3
           → Groups by date:
             • Feb 1: 2 transcriptions
             • Feb 3: 1 transcription
           → Upload to R2:
             • transcriptions/user@email.com/2026-02-01/transcription.json
             • transcriptions/user@email.com/2026-02-03/transcription.json
           → Delete all batched transcriptions from MongoDB
           → Update cutoff to Feb 4 23:59 PM
```

### R2 Storage Structure

**Base URL**: `https://pub-b5f134142a0f4fbdb5c05a2f75fc8624.r2.dev`
**Bucket**: `mentra-notes`
**Path Format**: `transcriptions/{userEmail}/{YYYY-MM-DD}/transcription.json`

**Examples**:
```
transcriptions/john@example.com/2026-02-01/transcription.json
transcriptions/jane@example.com/2026-02-01/transcription.json
transcriptions/john@example.com/2026-02-02/transcription.json
```

**Key Properties**:
- One file per user per day
- Date represents the **creation date** of transcriptions, not batch date
- Date format: `YYYY-MM-DD` (ISO 8601)
- Date calculated in user's local timezone
- Files are immutable (not updated after creation)

### Data Format

Each R2 file contains a JSON object with metadata and an array of transcriptions:

```json
{
  "userEmail": "user@example.com",
  "date": "2026-02-04",
  "timezone": "America/Los_Angeles",
  "batchedAt": "2026-02-05T08:01:23.456Z",
  "transcriptionCount": 3,
  "transcriptions": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userEmail": "user@example.com",
      "directionizationId": "speaker-001",
      "content": "Hello, this is a test transcription.",
      "createdAt": "2026-02-04T15:30:00.000Z",
      "date": "2026-02-04"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "userEmail": "user@example.com",
      "directionizationId": "speaker-002",
      "content": "This is the second transcription.",
      "createdAt": "2026-02-04T16:45:00.000Z",
      "date": "2026-02-04"
    }
  ]
}
```

**Field Descriptions**:
- `userEmail`: User identifier
- `date`: Date of transcriptions (YYYY-MM-DD in user's timezone)
- `timezone`: User's timezone at time of batching
- `batchedAt`: ISO timestamp when batch was uploaded to R2
- `transcriptionCount`: Number of transcriptions in this batch
- `transcriptions`: Array of MongoDB documents (all fields preserved)
  - `_id`: MongoDB ObjectId
  - `userEmail`: User identifier (matches parent)
  - `directionizationId`: Speaker identification
  - `content`: Actual transcript text
  - `createdAt`: ISO timestamp when transcription was created
  - `date`: Formatted date string from MongoDB

### MongoDB Cleanup

**When**: Immediately after successful R2 upload
**What**: Permanent deletion of uploaded transcriptions
**Why**: Save database storage costs, transcriptions accessible via R2

**Safety Guarantees**:
- Deletion only occurs after confirmed successful R2 upload (HTTP 200)
- MongoDB transcriptions preserved until upload succeeds
- If upload fails, transcriptions remain in MongoDB
- Next cutoff crossing retries the batch

**Query Strategy**:
```
Delete where:
  - userEmail = <user>
  - date = <YYYY-MM-DD>
  - createdAt <= <batchCutoff>
```

## Technical Behavior

### Upload Flow

**Trigger Point**: `User.handleBatchCutoffCrossed()` (from Issue 01)

**Step-by-Step Process**:
1. Cutoff crossed detected by Issue 01 logic
2. Query MongoDB for all transcriptions before cutoff
3. Group transcriptions by `date` field (YYYY-MM-DD)
4. For each date group:
   a. Format as JSON object with metadata
   b. Upload to R2: `transcriptions/{userEmail}/{date}/transcription.json`
   c. Verify upload success (check response status)
   d. If success: Delete that date's transcriptions from MongoDB
   e. If failure: Log error, keep transcriptions, skip to next
5. Track last successful batch date in UserState
6. Update cutoff to next day (only after all uploads attempted)
7. Current transcription saved to MongoDB

**Performance Characteristics**:
- No hard batch size limit
- Handle users with large backlogs (days/weeks of transcriptions)
- Process uploads sequentially (one date at a time)
- Parallel uploads risk overwhelming R2 rate limits

### Error Handling

**Upload Failures**:
- Immediate retry with exponential backoff (3 attempts)
- Retry delays: 1s, 2s, 4s
- If all retries fail: Log error, keep transcriptions, continue to next date
- On next cutoff crossing, retry failed batches

**Network Issues**:
- Timeout after 30 seconds per upload
- Transcriptions remain in MongoDB until success
- No data loss

**MongoDB Query Failures**:
- Log error with full context
- Don't update cutoff (retry next time)
- Alert for monitoring

**Partial Upload Scenario**:
```
User has 3 days of backlog: Feb 1, Feb 2, Feb 3
- Feb 1: Upload success ✓ → Delete from MongoDB
- Feb 2: Upload fails ✗ → Keep in MongoDB
- Feb 3: Upload success ✓ → Delete from MongoDB

Result:
- R2 has: Feb 1 ✓, Feb 3 ✓
- MongoDB has: Feb 2 only
- Next cutoff: Retry Feb 2 only
```

### Concurrent Session Handling

**Problem**: Same user might have multiple active sessions

**Solution**:
- Use MongoDB atomic operations for deletion
- Track "last batched date" in UserState
- Check if date already batched before uploading
- Second session finds no transcriptions (already batched)
- Duplicate uploads prevented

**Example**:
```
Session A: Crosses cutoff → Starts batch upload
Session B (5 seconds later): Crosses cutoff → Queries MongoDB
  → Finds no unbatched transcriptions (A already deleted them)
  → Skips upload, updates cutoff
```

## Edge Cases

### 1. User Returns After Long Absence

**Scenario**: User inactive for 2 weeks, returns on day 15

**Behavior**:
- System finds 14 days of unbatched transcriptions
- Creates 14 separate R2 files (one per day)
- Uploads sequentially
- Cleans up MongoDB after each successful upload
- May take 30-60 seconds total
- User's current transcription still processed normally

**Limits**: None, handles any backlog size

### 2. Upload Fails Repeatedly

**Scenario**: R2 unavailable or API key expired

**Behavior**:
- Transcriptions accumulate in MongoDB
- Each cutoff crossing attempts upload
- Exponential backoff prevents hammering R2
- Alert triggered after 3 consecutive failures
- Manual intervention required

**User Impact**: None, transcriptions continue saving to MongoDB

### 3. Large Single-Day Batch

**Scenario**: User transcribes heavily on one day (1000+ transcriptions)

**Behavior**:
- All transcriptions uploaded in single large JSON file
- No chunking/splitting (per user requirement)
- May take longer to upload
- All-or-nothing: Either entire day uploads or none

**Memory**: Load all into memory as JSON
**Network**: Single large request to R2
**Timeout**: May need longer timeout (60s+)

### 4. Timezone Change Mid-Backlog

**Scenario**: User has backlog, changes timezone, then transcribes

**Behavior**:
- Existing transcriptions already have `date` field set
- Batch uses existing `date` field (immutable)
- New transcriptions use new timezone for date calculation
- No retroactive date changes

### 5. Same Date, Different Timezone

**Scenario**: User travels across timezones on same calendar day

**Behavior**:
- R2 folder determined by `date` field in MongoDB
- Date field set at transcription creation time
- All transcriptions with same `date` value go to same R2 file
- Timezone change doesn't affect already-saved transcriptions

## Success Metrics

**Phase 2 Success Criteria**:
- ✅ Transcriptions uploaded to R2 at correct path
- ✅ JSON format valid and contains all metadata
- ✅ MongoDB cleaned up after successful upload
- ✅ Multi-day backlogs handled correctly
- ✅ Upload failures handled gracefully (retry)
- ✅ No data loss (transcriptions in R2 or MongoDB, never lost)
- ✅ Cutoff detection still works (Issue 01 functionality preserved)
- ✅ Performance acceptable for large backlogs

**How to Verify**:
1. Check R2 bucket for uploaded files:
   ```bash
   aws s3 ls s3://mentra-notes/transcriptions/ --recursive
   ```
2. Download and validate JSON format:
   ```bash
   aws s3 cp s3://mentra-notes/transcriptions/user@email.com/2026-02-04/transcription.json -
   ```
3. Check MongoDB for cleanup:
   ```javascript
   db.transcripts.find({userEmail: "user@email.com", date: "2026-02-04"})
   // Should return empty after batch
   ```
4. Check logs for "📦 UPLOADED TO R2" messages
5. Simulate upload failure (invalid credentials)
6. Verify transcriptions retained in MongoDB
7. Test multi-day backlog scenario

## User Impact

### What users will notice:
- Nothing! Batching happens automatically in the background
- Transcriptions continue to work exactly as before
- No UI changes or user interaction required

### What users won't notice:
- R2 uploads happening after midnight
- MongoDB cleanup operations
- Multi-day backlog processing (happens quickly)

### Benefits (now delivered):
- ✅ Faster transcription queries (less MongoDB data)
- ✅ Lower MongoDB costs (data moved to cheaper R2 storage)
- ✅ Better data organization (daily batches in R2)
- ✅ Historical transcripts accessible via R2 API
- ✅ No risk of data loss (reliable upload + cleanup)

## Future Enhancements (Not in Phase 2)

**Not included in current implementation**:
- Compression (gzip) for R2 files
- Batch status UI (show user their R2 files)
- Historical batch retrieval API
- Batch analytics (transcriptions per day, etc.)
- Custom batch times (other than midnight)
- Manual batch trigger button
- Batch size optimization/splitting

**Current implementation prepares for these by**:
- Establishing R2 upload infrastructure
- Creating JSON format with extensible metadata
- Implementing error handling and retry logic
- Providing monitoring hooks via logs
