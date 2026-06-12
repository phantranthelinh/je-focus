# Ambient Sound Mixer — Design Spec

- **Date:** 2026-06-12
- **Topic:** Wire up an ambient sound mixer (rain / thunder / wind / water + existing ambient sounds) with independent per-channel volume, accessible from the navbar, without changing the current timer UI.
- **Status:** Approved approach (Option A — navbar icon → floating popover)

## 1. Goal

Let the user play looping ambient sounds while focusing. Each sound is an independent channel: toggle on/off individually, set its own volume, and run **multiple sounds at the same time**. There is also a master volume and a mute-all control.

**Hard constraint:** the existing timer page (mascot, status text, `25:00`, START/reset, "Today — sessions" bottom sheet) must stay visually unchanged. The only new affordance on screen is a small sound icon added to the navbar's right-hand cluster.

## 2. Current State (what already exists)

The audio system is **fully built but never wired into the UI**:

- `src/stores/audio-store.ts` — Zustand store. Per-sound `channels: Record<id, {id, volume, enabled}>`, `masterVolume` (0.8 default), `isMuted`. Actions: `setVolume`, `toggleChannel`, `setMasterVolume`, `toggleMute`, `loadMix`, `resetMix`. **Already supports independent volume + simultaneous playback — no changes needed.**
- `src/lib/audio-engine.ts` — Web Audio API singleton. Per-channel gain nodes → master gain → destination. Crossfade (0.3s), smooth volume ramps, `loop = true`, `preload()`, `resume()`/`isSuspended()` for the browser autoplay lock.
- `src/hooks/use-audio-mixer.ts` — preloads buffers on mount, syncs store → engine, disposes on unmount.
- `src/components/audio/` — `MixerPanel`, `SoundToggle`, `VolumeSlider`, `AudioUnlockPrompt`. `AudioUnlockPrompt` is already rendered in the root layout; the rest are exported but **never imported**.
- `.glass` / `.glass-strong` in `globals.css` now render a **white** minimalist card (not the green glass described in CLAUDE.md), so reusing them keeps the current aesthetic.

**Gaps:** (a) the 8 catalog `.mp3` files do not exist in `public/sounds/`; (b) the mixer UI is not rendered anywhere; (c) the catalog has no `thunder` and no flowing-`water` sound.

## 3. Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Sound set | Keep existing ambient (`rain, ocean, fire, birds, wind`) **+ add `thunder`, `water`** → 7 ambient. **Drop the 3 lo-fi entries** from the catalog. |
| UI placement | **Option A** — a sound icon in the navbar right cluster opens a floating popover panel. Timer page untouched. |
| Audio files | Download free CC0 loops (Pixabay) into `public/sounds/ambient/`. |
| Persistence | In-memory Zustand only for this iteration. DB `saveMix` (already in `sound` router) deferred. |

## 4. Changes

### 4.1 Catalog — `src/lib/sounds.ts`
- Add to ambient: `{ id: 'thunder', label: 'Thunder', category: 'ambient', src: '/sounds/ambient/thunder.mp3' }` and `{ id: 'water', label: 'Stream', category: 'ambient', src: '/sounds/ambient/water.mp3' }`.
- **Remove** the three `lofi-*` entries. Final catalog = 7 ambient sounds. `LOFI_SOUNDS` will be an empty array (kept for export compatibility) — verify no consumer breaks on empty.

### 4.2 Resilient preload — `src/lib/audio-engine.ts`
- Wrap each per-sound fetch/decode in `preload()` in `try/catch` so a single missing/corrupt file logs a warning and skips that sound instead of rejecting the whole `Promise.all`. `play()` already no-ops when a buffer is absent.

### 4.3 Audio assets — `public/sounds/ambient/`
- Provide 7 looping `.mp3` files named exactly: `rain, ocean, fire, birds, wind, thunder, water`. Source: CC0/royalty-free (Pixabay). Keep each reasonably small (seamless loop, ~30–60s).

### 4.4 New UI — `src/components/audio/sound-popover.tsx`
- A client component: an icon button (lucide, e.g. `Volume2` / `Music`) rendered in the navbar's right cluster, with a small badge showing the count of active channels when > 0.
- Clicking toggles a **floating popover** anchored top-right: fixed-position overlay panel (mirrors the `DailyTracker` overlay approach), white/minimal styling consistent with `.glass`. Click-outside and `Esc` close it.
- Panel contents (reuse `use-audio-mixer` + `SoundToggle` + `VolumeSlider`, restyled if needed to match white theme):
  - Header row: master volume slider + mute-all toggle + active count.
  - Grid of the 7 ambient sound toggles (icon + label). Clicking toggles `enabled`.
  - For each **enabled** sound, show its individual `VolumeSlider`.
- The popover mounting `use-audio-mixer` is what triggers preload + engine sync. `AudioUnlockPrompt` (already in layout) handles the suspended-context unlock.

### 4.5 Wire into navbar — `src/components/ui/nav-bar.tsx`
- Render `<SoundPopover />` in the right-hand `div` (before/after the Clerk auth control). No other layout change.

## 5. Data Flow

User clicks a sound toggle → `toggleChannel(id)` updates Zustand → `use-audio-mixer` effect diffs state → calls `audioEngine.play(id, volume)` / `stop(id)`. Volume slider → `setVolume(id, v)` → `audioEngine.setVolume(id, v)` (smooth ramp). Master/mute → `setMasterVolume` / `toggleMute` → `audioEngine.setMasterVolume(...)`. Multiple channels each have their own gain node, so any number play simultaneously at independent volumes.

## 6. Error Handling

- Missing/corrupt audio file: skipped during preload (4.2); toggling it plays nothing (no crash).
- Browser autoplay lock: existing `AudioUnlockPrompt` resumes the context on first interaction.
- Popover never blocks timer interaction (overlay is dismissible, timer controls remain reachable once closed).

## 7. Testing (manual via preview)

1. Page loads; timer UI is pixel-identical to before; new sound icon visible in navbar.
2. Open popover → toggle Rain → audio plays and loops.
3. Toggle Thunder + Water as well → all three play simultaneously.
4. Move each sound's slider → only that channel's volume changes.
5. Master volume → scales all; Mute → silences all, unmute restores.
6. Active-count badge reflects number of enabled channels.
7. Close popover (click-outside / Esc) → audio keeps playing; reopen shows same state.

## 8. Out of Scope (YAGNI for this iteration)

- Saving/loading named mixes to the DB (router exists, deferred).
- Lo-fi music channels.
- Playlists / presets like Noisli.
- Persisting mix to localStorage across reloads.
