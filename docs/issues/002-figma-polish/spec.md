# Figma Design Polish

## Problem

Our implementation is functionally solid but lacks visual polish from the figma-design reference. We also have some features in figma that we haven't implemented yet.

## Solution

Adopt visual polish and missing features from figma-design while keeping our superior architecture (TipTap editor, synced lib, hour summaries, historical transcripts).

---

## Changes - Visual Polish

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
Replace custom drawer with `vaul` for proper spring physics + backdrop blur.

**Add dependency:** `vaul`

**Location:** `QuickActionsDrawer.tsx`

**Reference:** `figma-design/src/app/App.tsx` L278-310

### 5. Bottom Nav Polish (Medium Impact)
Fix the awkward floating Zap button on mobile. Currently `-mt-4` makes it look disconnected.

**Location:** `Shell.tsx`

**Reference:** `figma-design/src/app/components/BottomNav.tsx` - proper spacing with `h-[72px]`, `px-12`, `pb-2`

### 6. FAB Expand Animation (Optional)
Animated expanding FAB with pill options instead of immediately opening drawer.

**Add dependency:** `motion` (framer-motion)

**Location:** `NotesTab.tsx`

**Reference:** `figma-design/src/app/components/tabs/NotesTab.tsx` L80-130

---

## Changes - Missing Features

### 7. Filter & Sort Dropdown (Medium Impact)
"All Files" button in header opens drawer with:
- Filters: All files / Archived / Trash (with counts)
- Views: All Notes / Favorites (with counts)
- Sort options

**Location:** `HomePage.tsx`, new `FilterDrawer.tsx`

**Reference:** `figma-design/src/app/views/FolderList.tsx` L226-248 (FilterOption), L176-222 (drawer)

### 8. Calendar View (Medium Impact)
Toggle between list view and calendar month view. Calendar shows:
- Month navigation (prev/next)
- Day grid with activity dots
- Click day to navigate to that day's folder

**Location:** `HomePage.tsx`, new `CalendarView.tsx`

**Reference:** `figma-design/src/app/views/FolderList.tsx` L250-270 (calendar logic), L420-480 (calendar UI)

### 9. Global AI Chat (High Impact)
"Ask Mentra" - AI chat that searches across ALL days/notes/transcripts (not just one day).

**Accessible via:** Sparkles icon in header (with pulsing glow animation)

**Location:** New `GlobalAIChatPage.tsx` or slide-over view

**Reference:** `figma-design/src/app/views/GlobalAIChat.tsx`

**Features:**
- Welcome message explaining capability
- Suggestion chips: "Summarize my week", "What notes mention X?", "List all action items"
- Search across all content
- Gradient fade input area at bottom

---

## Acceptance

### Visual Polish
- [x] Transcribing indicator uses animated SVG bars + shimmer text
- [x] Notes grid uses masonry layout
- [x] Note cards have polished badge styling  
- [x] QuickActionsDrawer uses vaul with backdrop blur
- [x] Bottom nav Zap button is properly integrated (not floating awkwardly)
- [x] Animations feel smooth and native

### Missing Features
- [x] Filter & sort dropdown works (All files / Archived / Trash / Favorites)
- [x] Calendar view toggles from list view
- [x] Global AI chat accessible via sparkles icon
- [ ] Global AI chat can search across all days (backend pending)

---

## Intentionally Different (Our Implementation is Better)

These areas we reviewed the figma-design and deliberately kept our implementation:

### 1. Note Editor (NotePage.tsx)

**Figma:** Basic `contentEditable` div with static bottom toolbar (Bold/Italic/List buttons always visible).

**Ours:** Full TipTap rich text editor with:
- Bubble menu that appears on text selection (cleaner, less cluttered)
- Proper markdown parsing for AI-generated content
- Auto-save with debounce and "Saved" indicator
- Placeholder extension for empty state
- Proper heading levels, lists, formatting

**Why ours is better:** Actually functional editor vs demo. The bubble menu pattern (like Notion) is more modern than a fixed toolbar.

### 2. Transcript Tab (TranscriptTab.tsx)

**Figma:** Simple collapsible hours, no summary system, just raw transcript display.

**Ours:** Smart transcript with:
- Hour summaries with AI generation (click sparkle icon)
- Smart banner logic: Interim text → Hour Summary → First segment preview
- Sticky headers while scrolling expanded sections
- Auto-scroll for new segments (only when near bottom)
- Historical date loading from backend
- Loading states for summary generation

**Why ours is better:** The hour summary feature is a core product differentiator. Figma shows the UI shell but no actual intelligence.

### 3. Data Architecture

**Figma:** All mock data in `mockData.ts`, no real backend connection.

**Ours:** Full synced state architecture with:
- Custom `@synced` decorator system for reactive state (see `src/lib/sync`)
- `SyncedManager` classes with `@rpc` decorated methods callable from frontend
- Real-time transcript from glasses via MentraOS WebSocket
- MongoDB persistence for notes, transcripts, hour summaries
- Historical transcript loading by date via `loadDateTranscript` RPC
- Live `isRecording` state synced from backend
- Session management per-user with glasses connect/disconnect handling

**Why ours is better:** Production-ready architecture with real data flow. The synced lib provides automatic state synchronization between backend managers and frontend hooks (`useSynced`).

### 4. File/Component Organization

**Figma:** Flat structure - all components in `components/`, all views in `views/`.

**Ours:** Colocated structure:
- Pages live in `pages/{pageName}/`
- Page-specific components live in `pages/{pageName}/components/`
- Shared components live in `components/shared/`

**Why ours is better:** Code lives close to where it's used. Easy to find related files. Shared components are explicitly marked as shared.

### 5. Desktop + Mobile Responsive Design

**Figma:** Mobile-only design in a fixed 480px frame.

**Ours:** Responsive design with:
- Desktop: Left sidebar navigation
- Mobile: Bottom tab bar navigation
- Proper breakpoint handling

**Why ours is better:** Works on all screen sizes, not just mobile.