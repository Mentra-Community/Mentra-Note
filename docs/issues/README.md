# Issues

This folder tracks feature development and bug fixes with lightweight documentation.

## Creating an Issue

1. Create a folder: `NNN-short-name` (e.g., `001-note-card-preview`)
2. Add two files:
   - `spec.md` - What we're building and why
   - `design.md` - Technical decisions made

## Format

### spec.md

```md
# Title

## Problem
What's broken or missing. Screenshots if relevant.

## Solution
What we're doing to fix it.

## Acceptance
- [ ] Checkbox list of done criteria
```

### design.md

```md
# Title - Design

## Decisions
- Decision 1: reasoning
- Decision 2: reasoning

## Changes
- `path/to/file.ts` - what changed

## Notes
Any gotchas or future considerations.
```

## Rules

- No fluff - be direct
- Screenshots > paragraphs
- Update as you go, not after
- Close by adding `status: done` to spec.md