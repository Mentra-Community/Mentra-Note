# Figma Design Polish

## Problem

Our implementation is functionally solid but lacks the visual polish from the figma-design reference. Key areas where figma looks better:

1. **Transcribing indicator** - Figma has animated SVG bars + shimmer text, we have a simple pulsing dot
2. **Notes grid** - Figma uses masonry layout, we use fixed 2-column grid
3. **FAB animation** - Figma has smooth expand/collapse with stacked options, ours opens a drawer
4. **Drawer animations** - Figma uses `vaul` with proper spring physics + backdrop blur
5. **Note card badges** - Figma has more refined "AI Generated" / "Manual" styling

## Solution

Adopt visual polish from figma-design while keeping our superior architecture:
- Keep: TipTap editor, synced data, hour summaries, historical transcript loading
- Adopt: Animations, masonry grid, transcribing indicator, drawer polish

## Changes

### 1. Transcribing Indicator (High Impact)
Replace pulsing dot with animated SVG waveform bars + shimmer text effect.

**Locations:**
- `FolderList.tsx` - folder row "Transcribing..." indicator  
- `DayPage.tsx` - header recording indicator

**Reference:** `figma-design/src/app/views/FolderList.tsx` L91-110

### 2. Masonry Note Grid (Medium Impact)
Switch from fixed 2-col grid to responsive masonry for varied card heights.

**Add dependency:** `react-responsive-masonry`

**Location:** `NotesTab.tsx`

**Reference:** `figma-design/src/app/components/tabs/NotesTab.tsx` L36-70

### 3. Note Card Badge Styling (Low Impact)
Refine "AI Generated" (green) and "Manual" (gray) badge styling.

**Location:** `NoteCard.tsx`

**Reference:** `figma-design/src/app/components/tabs/NotesTab.tsx` L55-67

### 4. Drawer Upgrade (Medium Impact)
Replace custom drawer with `vaul` for proper spring physics.

**Add dependency:** `vaul`

**Location:** `QuickActionsDrawer.tsx`

**Reference:** `figma-design/src/app/App.tsx` L278-310

### 5. FAB Expand Animation (Optional)
Animated expanding FAB with pill options instead of opening drawer.

**Add dependency:** `motion` (framer-motion)

**Location:** `NotesTab.tsx`

**Reference:** `figma-design/src/app/components/tabs/NotesTab.tsx` L80-130

## Acceptance

- [ ] Transcribing indicator uses animated SVG bars + shimmer text
- [ ] Notes grid uses masonry layout
- [ ] Note cards have polished badge styling
- [ ] QuickActionsDrawer uses vaul with backdrop blur
- [ ] Animations feel smooth and native

## Out of Scope

- Bottom navigation (different navigation paradigm)
- Global AI chat (feature scope difference)
- Calendar view (future feature)