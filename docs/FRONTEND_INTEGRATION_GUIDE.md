# Frontend Integration Guide

This guide explains how to integrate SEGA's views with the backend APIs.

## Quick Start

### 1. Import the API Client

```typescript
import { api } from '@/api/client';
```

### 2. Use the Hook for Real-Time Updates

```typescript
import { useSSE } from '@/hooks/useSSE';

const { lastEvent, getEventsByType, isConnected } = useSSE(userId);
```

### 3. Handle Loading and Errors

```typescript
import { SkeletonLoader, ErrorState } from '@/components/shared';

if (loading) return <SkeletonLoader variant="card" count={3} />;
if (error) return <ErrorState message={error} onRetry={reload} />;
```

### 4. Use Mock Data Fallback

```typescript
import { fetchWithFallback } from '@/lib/devMode';

const { data, isMock } = await fetchWithFallback(
  () => api.getNotes(),
  mockNotes,
  'Failed to load notes'
);
```

## Detailed Pattern

Here's the complete pattern for integrating a view:

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { fetchWithFallback } from '@/lib/devMode';
import { useSSE, type NotesReadyEvent } from '@/hooks/useSSE';
import { SkeletonLoader, ErrorState } from '@/components/shared';
import { mockData } from '@/lib/mockData';

interface ViewProps {
  userId: string;
  selectedDate?: string;
}

export function MyView({ userId, selectedDate }: ViewProps) {
  // State
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(true);

  // Real-time updates from backend
  const { lastEvent, isConnected } = useSSE(userId);

  // ===========================================================================
  // Load data on mount and when filters change
  // ===========================================================================

  useEffect(() => {
    loadData();
  }, [selectedDate]); // Re-load when date changes

  // ===========================================================================
  // Listen for real-time updates and refresh data
  // ===========================================================================

  useEffect(() => {
    if (!lastEvent) return;

    // Refresh when notes are ready
    if (lastEvent.type === 'notes_ready') {
      console.log('New notes available');
      loadData(); // Refresh to show new data
    }

    // Show connection status
    if (!isConnected) {
      setError('Disconnected from server');
    }
  }, [lastEvent, isConnected]);

  // ===========================================================================
  // Fetch data with fallback to mock data
  // ===========================================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API with fallback to mock
      const { data: fetchedData, isMock } = await fetchWithFallback(
        async () => {
          // Call API with optional filters
          if (selectedDate) {
            return api.getNotes({ date: selectedDate });
          }
          return api.getNotes();
        },
        mockData,
        'Failed to load data'
      );

      setData(fetchedData);
      setUsingMockData(isMock);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setUsingMockData(true); // Fall back to mock
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================================
  // Rendering
  // ===========================================================================

  // Loading state
  if (loading) {
    return <SkeletonLoader variant="card" count={3} />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  // Data view
  return (
    <div>
      {/* Show demo indicator if using mock data */}
      {usingMockData && (
        <div className="mb-4 text-xs text-yellow-600 dark:text-yellow-400">
          Demo data (backend unavailable)
        </div>
      )}

      {/* Your content here */}
      {/* Use `data` from state */}
    </div>
  );
}
```

## API Patterns

### Fetching Data

```typescript
// Get notes for a date
const notes = await api.getNotes({ date: '2026-01-31' });

// Get all notes
const allNotes = await api.getNotes();

// Get action items by status
const todos = await api.getActionItems({ status: 'todo' });

// Get a specific item
const note = await api.getNote(noteId);
```

### Updating Data

```typescript
// Update action status (optimistic update pattern)
const oldActions = [...actions];
setActions(actions.map(a =>
  a.id === actionId ? { ...a, status: 'done' } : a
));

try {
  await api.updateActionItem(actionId, { status: 'done' });
  toast.success('Action updated');
} catch (err) {
  // Rollback on error
  setActions(oldActions);
  toast.error('Failed to update action');
}
```

### Creating Data

```typescript
// Create a manual note
const newNote = await api.createNote({
  content: 'My note',
  meetingId: currentMeetingId,
});
setNotes([...notes, newNote]);
```

### Deleting Data

```typescript
// Delete an action
await api.deleteActionItem(actionId);
setActions(actions.filter(a => a.id !== actionId));
```

## SSE Event Patterns

### Listen for Specific Event Type

```typescript
import type { NotesReadyEvent } from '@/hooks/useSSE';

useEffect(() => {
  if (!lastEvent) return;

  if (lastEvent.type === 'notes_ready') {
    const event = lastEvent as NotesReadyEvent;
    console.log('Notes ready:', event.noteId);
    console.log('Summary:', event.summary);
    loadData(); // Refresh
  }
}, [lastEvent]);
```

### Listen for Multiple Event Types

```typescript
useEffect(() => {
  if (!lastEvent) return;

  switch (lastEvent.type) {
    case 'transcript':
      handleTranscript(lastEvent);
      break;
    case 'meeting_started':
      handleMeetingStarted(lastEvent);
      break;
    case 'notes_ready':
      handleNotesReady(lastEvent);
      break;
    case 'research_progress':
      handleResearchProgress(lastEvent);
      break;
  }
}, [lastEvent]);
```

### Get All Events of a Type

```typescript
const { getEventsByType } = useSSE(userId);

// Get all research progress events
const progressEvents = getEventsByType('research_progress');
progressEvents.forEach(event => {
  console.log(event.message);
});
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  await api.updateNote(noteId, { summary: newSummary });
  setNotes(notes.map(n => n.id === noteId ? { ...n, summary: newSummary } : n));
} catch (error) {
  console.error('Failed to update note:', error);
  setError('Failed to save changes');
}
```

### With Retry

```typescript
import { retryWithBackoff } from '@/lib/devMode';

try {
  const note = await retryWithBackoff(
    () => api.getNote(noteId),
    3, // max retries
    1000 // initial delay
  );
  setNote(note);
} catch (error) {
  setError('Failed to load note after retries');
}
```

## Development Mode

### Force Mock Data

```javascript
// In browser console
localStorage.setItem('sega:forceMockData', 'true')
```

Or use keyboard shortcut: **Cmd+Shift+D**

### View API Performance Stats

```javascript
// In browser console
localStorage.setItem('sega:forceMockData', 'false') // Disable mock mode
// Make some API calls
localStorage.getItem('sega:forceMockData') // Check stats
```

Or use keyboard shortcut: **Cmd+Shift+S**

## Type Safety

All API responses and SSE events are fully typed:

```typescript
import type {
  Note,
  ActionItem,
  Meeting,
  ResearchResult,
  NotesReadyEvent,
  MeetingStartedEvent,
} from '@/api/client';
import type { NotesReadyEvent } from '@/hooks/useSSE';

// API client returns typed data
const notes: Note[] = await api.getNotes();
const note: Note = await api.getNote(noteId);
const actions: ActionItem[] = await api.getActionItems();

// SSE events are discriminated unions
if (lastEvent.type === 'notes_ready') {
  const event = lastEvent as NotesReadyEvent; // TypeScript knows the shape
  console.log(event.noteId); // Type-safe
}
```

## Component Examples

### TodayView Integration

```typescript
// Key updates needed:
// 1. Replace demo sequence with real SSE handlers
// 2. Listen for: transcript, state_update, meeting_started, meeting_ended, notes_ready, research_* events
// 3. Keep mock data fallback
// 4. Add loading states

useEffect(() => {
  if (!lastEvent) return;

  switch (lastEvent.type) {
    case 'transcript':
      setNotes(prev => [...prev, lastEvent.text]);
      break;
    case 'meeting_started':
      setMeetingStatus('active');
      break;
    case 'meeting_ended':
      setMeetingStatus('ended');
      loadNotes(); // Refresh notes after meeting ends
      break;
    case 'notes_ready':
      loadNotes(); // Refresh to show new notes
      break;
  }
}, [lastEvent]);
```

### NotesView Integration

```typescript
// Key updates needed:
// 1. Fetch notes using api.getNotes({ date: selectedDate })
// 2. Transform API response to component structure
// 3. Add loading skeleton
// 4. Listen for notes_ready event to refresh

useEffect(() => {
  const loadNotes = async () => {
    const { data, isMock } = await fetchWithFallback(
      () => api.getNotes({ date: selectedDate }),
      mockFolders,
      'Failed to load notes'
    );
    setFolders(data);
    setUsingMockData(isMock);
  };

  loadNotes();
}, [selectedDate]);

useEffect(() => {
  if (lastEvent?.type === 'notes_ready') {
    loadNotes(); // Refresh when new notes are ready
  }
}, [lastEvent]);
```

### ActionsView Integration

```typescript
// Key updates needed:
// 1. Fetch actions using api.getActionItems()
// 2. Implement optimistic updates for status changes
// 3. Rollback on error

const updateActionStatus = async (id: string, status: string) => {
  const oldActions = [...actions];
  setActions(actions.map(a => a.id === id ? { ...a, status } : a));

  try {
    await api.updateActionItem(id, { status });
    toast.success('Action updated');
  } catch (err) {
    setActions(oldActions);
    toast.error('Failed to update action');
  }
};
```

## Common Mistakes to Avoid

### ❌ Don't forget to handle loading state

```typescript
// Bad
const [data, setData] = useState(null);
useEffect(() => {
  api.getNotes().then(setData);
}, []);

// Good
const [loading, setLoading] = useState(true);
useEffect(() => {
  setLoading(true);
  api.getNotes()
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

### ❌ Don't ignore errors

```typescript
// Bad
api.getNotes().then(setData); // What if this fails?

// Good
api.getNotes()
  .then(setData)
  .catch(err => setError(err.message));
```

### ❌ Don't forget mock data fallback

```typescript
// Bad
const notes = await api.getNotes(); // Fails if backend is down

// Good
const { data: notes } = await fetchWithFallback(
  () => api.getNotes(),
  mockNotes,
  'Failed to load notes'
);
```

### ❌ Don't update state after unmount

```typescript
// Bad
useEffect(() => {
  api.getNotes().then(setData); // Memory leak if component unmounts
}, []);

// Good
useEffect(() => {
  let mounted = true;
  api.getNotes().then(data => {
    if (mounted) setData(data);
  });
  return () => { mounted = false; };
}, []);
```

## Testing Checklist

- [ ] Data loads on component mount
- [ ] Loading skeleton shows while fetching
- [ ] Error state shows with retry button
- [ ] Mock data fallback works (dev mode toggle)
- [ ] Real-time updates work (SSE events)
- [ ] Optimistic updates for user actions
- [ ] Rollback on API errors
- [ ] Connection indicator when disconnected
- [ ] No console errors
- [ ] Types are correct (no any types)

## Resources

- **Backend Design:** `/docs/backend-design-doc.md`
- **Product Spec:** `/docs/product-spec.md`
- **API Client:** `/src/webview/api/client.ts`
- **SSE Hook:** `/src/webview/hooks/useSSE.ts`
- **Dev Utilities:** `/src/webview/lib/devMode.ts`
- **Components:** `/src/webview/components/shared/`

## Questions?

Refer to:
1. The pattern examples in this guide
2. Existing component implementations
3. Backend design docs for expected data shapes
4. Type definitions in the API client
