# Figma Design Polish - Design

## Decisions

- **Use vaul for drawers**: Better spring physics and accessibility than custom implementation. Already used in figma-design, battle-tested library.

- **Use react-responsive-masonry for notes grid**: Lightweight, handles variable height cards well. Alternative was CSS grid masonry (limited browser support) or react-masonry-css (less maintained).

- **Use motion (framer-motion) for FAB animation**: Already a peer dep, provides AnimatePresence for enter/exit animations. Could use CSS but motion handles interrupts better.

- **Inline SVG for transcribing indicator**: No need for external animation library, SVG animate elements work well and are performant. Shimmer effect via CSS gradient animation.

- **Keep current drawer UX flow**: FAB → drawer makes sense for our app. Figma's inline expanding FAB is slick but drawer gives more room for future actions.

## Changes

### Dependencies
- `package.json` - add `vaul`, `react-responsive-masonry`, `motion`

### Components Modified
- `src/frontend/pages/home/components/FolderList.tsx` - transcribing indicator
- `src/frontend/pages/day/DayPage.tsx` - recording indicator in header
- `src/frontend/pages/day/components/tabs/NotesTab.tsx` - masonry grid
- `src/frontend/pages/day/components/NoteCard.tsx` - badge styling
- `src/frontend/components/shared/QuickActionsDrawer.tsx` - vaul migration

### New Components
- `src/frontend/components/shared/TranscribingIndicator.tsx` - reusable animated indicator

## Notes

- Test dark mode for all changes - shimmer gradient needs different colors
- Masonry may need min-height on cards to prevent odd layouts with very short content
- Vaul requires Radix dialog internally - check for conflicts with existing Radix usage