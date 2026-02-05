# Figma Design Polish - Design

## Decisions

### Visual Polish

- **Use vaul for drawers**: Better spring physics and accessibility than custom implementation. Already used in figma-design, battle-tested library.

- **Use react-responsive-masonry for notes grid**: Lightweight, handles variable height cards well. Alternative was CSS grid masonry (limited browser support) or react-masonry-css (less maintained).

- **Use motion (framer-motion) for FAB animation**: Provides AnimatePresence for enter/exit animations. Could use CSS but motion handles interrupts better.

- **Inline SVG for transcribing indicator**: No need for external animation library, SVG animate elements work well and are performant. Shimmer effect via CSS gradient animation.

- **Keep drawer UX flow for quick actions**: FAB → drawer makes sense. Figma's inline expanding FAB is slick but drawer gives more room for future actions. Can add expand animation as polish later.

### Missing Features

- **Filter & sort as drawer not popover**: Consistent with other drawers in the app. Drawer gives more room for filter options and works better on mobile.

- **Calendar view inline toggle**: Not a separate route - just toggle viewMode state in HomePage. Keeps navigation simple.

- **Global AI chat as slide-over**: Matches figma pattern. Uses same slide-in-from-right animation as folder detail. Not a separate route - overlay on top of current view.

- **Global AI chat backend**: Extend existing `ChatSyncedManager` or create new `GlobalChatSyncedManager`. Need to query across all dates, not just current day's transcript.

## Changes

### Dependencies
```json
{
  "vaul": "^1.1.2",
  "react-responsive-masonry": "^2.7.1",
  "motion": "^12.x"
}
```

### Components Modified
- `src/frontend/components/layout/Shell.tsx` - fix bottom nav spacing
- `src/frontend/pages/home/HomePage.tsx` - add filter dropdown, calendar toggle, global chat trigger
- `src/frontend/pages/home/components/FolderList.tsx` - transcribing indicator, filter support
- `src/frontend/pages/day/DayPage.tsx` - recording indicator in header
- `src/frontend/pages/day/components/tabs/NotesTab.tsx` - masonry grid
- `src/frontend/pages/day/components/NoteCard.tsx` - badge styling
- `src/frontend/components/shared/QuickActionsDrawer.tsx` - vaul migration

### New Components
- `src/frontend/components/shared/TranscribingIndicator.tsx` - reusable animated indicator
- `src/frontend/components/shared/FilterDrawer.tsx` - filter & sort options
- `src/frontend/pages/home/components/CalendarView.tsx` - month calendar grid
- `src/frontend/pages/home/components/GlobalAIChat.tsx` - cross-day AI search

### Backend Changes
- `src/backend/synced/managers.ts` - add global chat RPC methods to search across dates
- May need new MongoDB queries for cross-date search

## Notes

- Test dark mode for all changes - shimmer gradient needs different colors
- Masonry may need min-height on cards to prevent odd layouts with very short content
- Vaul requires Radix dialog internally - check for conflicts with existing Radix usage
- Global AI chat search will need proper indexing if we want fast full-text search across all transcripts
- Calendar view should highlight "today" and days with content (notes or transcripts)