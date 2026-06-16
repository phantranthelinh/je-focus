# Design: Distraction-Free Text Editor

**Date:** 2026-06-16  
**Status:** Approved

---

## Overview

A distraction-free writing page at `/text-editor` with TipTap editor, compact timer in navbar center, and word count + download icons fixed outside the editor container.

---

## Layout

```
┌──────────────────────────────────────────────┐
│ JeFocus    [Focus · 24:13 ▶ ↺]    [🔊] [👤] │  ← navbar, timer center
├──────────────────────────────────────────────┤
│         ┌── max-w-[1080px] ──┐   [文][↓]    │  ← icons fixed top-right outside container
│         │                   │               │
│         │  Start writing... │               │
│         │                   │               │
│         └───────────────────┘               │
└──────────────────────────────────────────────┘
```

---

## Components

### `src/app/text-editor/page.tsx`
Page shell. Renders `<TextEditor />`. Full-height, no extra padding.

### `src/components/editor/text-editor.tsx`
TipTap editor wrapper. Extensions: `StarterKit`, `Placeholder`, `CharacterCount`. Bubble menu (on selection): bold, italic, h1/h2. No fixed toolbar. `max-w-[1080px] mx-auto px-8 py-12`.

### `src/components/editor/editor-actions.tsx`
Word count + Download icons, `fixed top-20 right-6 flex flex-col gap-2`. 
- Word count: `FileText` icon + tooltip showing count
- Download: `Download` icon → exports `.txt` via Blob

### Navbar modification (`src/components/ui/nav-bar.tsx`)
- Add `PenLine` to navItems: `{ href: '/text-editor', label: 'Write', icon: <PenLine size={20} /> }`
- When `pathname === '/text-editor'`: render `<CompactTimer />` in the center slot instead of nav links

### `src/components/editor/compact-timer.tsx`
Reuses `useTimer()` hook. Shows: mode badge (`Focus`/`Break`) · `MM:SS` · start/pause button · reset button. No new state.

---

## Download behavior

Strip HTML from TipTap's `editor.getHTML()` using a regex or `DOMParser`, create a `Blob('text/plain')`, trigger `<a download="note.txt">`.

---

## Dependencies

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count` — install via npm

---

## Non-Goals

- No persistence (localStorage or DB)
- No rich export (PDF, DOCX)
- No collaboration
- No image upload
