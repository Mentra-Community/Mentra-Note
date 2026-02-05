# Note Card Preview - Design

## Decisions

- Strip HTML using regex, not DOM parser (lighter weight, works server-side)
- Preview length: 100 chars max with ellipsis
- Placeholder detection: check for known placeholder strings before rendering

## Changes

- `src/frontend/pages/day/components/NoteCard.tsx` - add `getPreviewText()` helper that:
  1. Strips HTML tags
  2. Checks if content is placeholder text
  3. Returns truncated plain text or empty state

## Notes

- Content is stored as HTML (from TipTap editor)
- Need to handle both `summary` and `content` fields
- Old notes may still have "Tap to edit this note..." stored - treat as empty