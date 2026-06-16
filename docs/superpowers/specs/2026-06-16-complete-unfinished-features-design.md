# Design: Complete Unfinished Features

**Date:** 2026-06-16  
**Status:** Approved  
**Scope:** Preset Switcher · Sound Preset UI · Guest→Auth Migration

---

## Overview

Three incomplete features will be implemented together. All use existing infrastructure (tRPC endpoints, Zustand stores, Clerk auth) — minimal new surface area.

---

## 1. Preset Switcher

**Goal:** Let users quickly switch between Pomodoro, Deep Work, and Quick presets directly on the timer page.

**Component:** `src/components/timer/preset-switcher.tsx` (new)

**UI:**
- Row of 3 pill buttons: `Pomodoro · Deep Work · Quick`
- Active preset: `bg-green-300/60` glassmorphism highlight
- Disabled + `opacity-50` when `isRunning === true`
- Clicking sets `useTimerStore.setPreset(key)`

**Integration:** Rendered in `src/app/page.tsx` between timer display and timer controls.

**Constraints:**
- Does not affect Custom config (still editable inline as today)
- No server calls — purely local store state

---

## 2. Sound Preset UI

**Goal:** Allow authenticated users to save, load, and delete named ambient sound mixes.

**Location:** Bottom of `src/components/audio/sound-popover.tsx`, below 7 sound toggles, separated by a divider.

**Guest behavior:** Show a small "Sign in to save mixes" text — no interactive UI.

**Auth user UI:**
- Text input + "Save" button → calls `trpc.sound.saveMix({ name, channels })`
- List of saved mixes (up to 5 shown), each row:
  - Mix name
  - Load button → applies mix via `useAudioStore.loadMix()`
  - Delete button → calls `trpc.sound.deleteMix({ id })`
- Data via `trpc.sound.getMixes.useQuery()` (only when signed in)
- Invalidate `getMixes` after every save or delete

**Constraints:**
- No new pages or routes
- Max display 5 presets (API may return more; slice to 5 in UI)
- Empty state: "No saved mixes yet"

---

## 3. Guest→Auth Session Migration

**Goal:** When a guest user signs in for the first time, automatically migrate their locally-tracked sessions to the server so no data is lost.

**New hook:** `src/hooks/use-auth-migration.ts`

**Logic:**
1. Watch `userId` via `useAuth()` from Clerk
2. On transition `null/undefined → string`:
   - Check `localStorage.getItem('migration_done_' + userId)` — skip if set
   - Read `useTrackingStore.getState().dailyLog`
   - If log has entries, call `trpc.timer.migrateSessions` mutation
   - On success: call `useTrackingStore.getState().clearAll()` + set migration flag in localStorage
3. Silent — no toast, no confirmation prompt

**New tRPC endpoint:** `timer.migrateSessions` (protected)
- Input: `{ sessions: { date: string, totalFocusSec: number, sessionCount: number }[] }`
- For each entry: create a synthetic `TimerSession` row with `preset: 'migrated'`, `totalFocusSec`, `completedAt` = noon of that date
- Skip dates that already have sessions in DB (upsert-safe)

**New tracking-store action:** `clearAll()` — resets `dailyLog` to `{}`

**Mount point:** `src/app/providers.tsx` — call hook inside a client component that wraps the app.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/timer/preset-switcher.tsx` | New component |
| `src/app/page.tsx` | Add `<PresetSwitcher />` |
| `src/components/audio/sound-popover.tsx` | Add preset save/load section |
| `src/hooks/use-auth-migration.ts` | New hook |
| `src/stores/tracking-store.ts` | Add `clearAll()` action |
| `src/server/routers/timer.ts` | Add `migrateSessions` procedure |
| `src/app/providers.tsx` | Mount migration hook |

---

## Non-Goals

- Leaderboard & Friends (separate spec)
- Keyboard shortcuts (separate spec)
- Dark mode (separate spec)
- Sound preset ordering/rename UI
- Export history
