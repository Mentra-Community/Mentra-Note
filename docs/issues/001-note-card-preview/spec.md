# Note Card Preview Bug

status: done

## Problem

Note cards in the day view show incorrect previews:
- Shows "Tap to edit this note..." instead of actual content
- Shows raw HTML like `<p></p>` 
- Doesn't strip HTML tags from preview

Screenshots show cards displaying placeholder text even after notes have been edited with real content.

## Solution

1. Fix NoteCard component to properly extract plain text from HTML content
2. Strip HTML tags and show first ~100 chars of actual content
3. Handle empty notes gracefully (show "No content" or similar)

## Acceptance

- [x] Note cards show actual content preview, not placeholder text
- [x] HTML tags are stripped from preview
- [x] Empty notes show clean empty state, not `<p></p>`
- [x] Preview truncates long content with ellipsis