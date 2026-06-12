# Ambient Sound Mixer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up an ambient sound mixer (rain, ocean, fire, birds, wind, thunder, water) — independent per-channel volume, multiple sounds simultaneously — reachable from a sound icon in the navbar, without changing the existing timer page UI.

**Architecture:** The audio engine (`audio-engine.ts`), store (`audio-store.ts`), and sync hook (`use-audio-mixer.ts`) already exist and already support independent channels + simultaneous playback — they are reused unchanged except for one defensive tweak to `preload()`. We extend the sound catalog with `thunder` + `water`, drop the unused lo-fi entries, add the 7 looping `.mp3` assets, and build one new `SoundPopover` component (navbar trigger + floating overlay panel) that reuses the existing `SoundToggle` / `VolumeSlider` primitives. The popover is mounted in `NavBar`, which lives in the root layout, so audio persists across route changes.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Zustand · Web Audio API · lucide-react · Tailwind CSS v4. No unit-test runner is configured; verification is `npx tsc --noEmit` (typecheck) + `npm run lint` + manual browser preview per the spec.

**Spec:** `docs/superpowers/specs/2026-06-12-ambient-sound-mixer-design.md`

---

### Task 1: Extend the sound catalog (add thunder + water, drop lo-fi)

**Files:**
- Modify: `src/lib/sounds.ts`

- [ ] **Step 1: Replace the catalog with the 7-ambient version**

Replace the entire `SOUND_CATALOG` array and the derived exports in `src/lib/sounds.ts` so the file reads exactly:

```ts
export type SoundCategory = 'ambient' | 'lofi';

export type SoundDefinition = {
  id: string;
  label: string;
  category: SoundCategory;
  src: string;
};

export const SOUND_CATALOG: SoundDefinition[] = [
  { id: 'rain',    label: 'Rain',    category: 'ambient', src: '/sounds/ambient/rain.mp3'    },
  { id: 'ocean',   label: 'Ocean',   category: 'ambient', src: '/sounds/ambient/ocean.mp3'   },
  { id: 'fire',    label: 'Fire',    category: 'ambient', src: '/sounds/ambient/fire.mp3'    },
  { id: 'birds',   label: 'Birds',   category: 'ambient', src: '/sounds/ambient/birds.mp3'   },
  { id: 'wind',    label: 'Wind',    category: 'ambient', src: '/sounds/ambient/wind.mp3'    },
  { id: 'thunder', label: 'Thunder', category: 'ambient', src: '/sounds/ambient/thunder.mp3' },
  { id: 'water',   label: 'Stream',  category: 'ambient', src: '/sounds/ambient/water.mp3'   },
];

export const AMBIENT_SOUNDS = SOUND_CATALOG.filter(s => s.category === 'ambient');
export const LOFI_SOUNDS    = SOUND_CATALOG.filter(s => s.category === 'lofi');
```

`LOFI_SOUNDS` is now an empty array but the export is kept so nothing that imports it breaks.

- [ ] **Step 2: Confirm no consumer breaks on empty LOFI_SOUNDS**

Run: `npx tsc --noEmit`
Expected: no errors. (Note: `mixer-panel.tsx` derives its own `lofiSounds` from `SOUND_CATALOG` and maps over it — an empty result just renders an empty grid, which is harmless because we do not mount `MixerPanel`.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sounds.ts
git commit -m "feat(sounds): add thunder + water ambient sounds, drop lo-fi catalog entries"
```

---

### Task 2: Make audio preload resilient to a missing/bad file

**Files:**
- Modify: `src/lib/audio-engine.ts` (the `preload()` method, lines ~27-38)

Rationale: `preload()` runs `Promise.all` over the whole catalog. If one `.mp3` fails to fetch/decode, the whole preload rejects and no sound works. Wrap each sound so one failure is isolated.

- [ ] **Step 1: Replace the `preload()` method body**

Replace the existing `preload()` method in `src/lib/audio-engine.ts` with:

```ts
  async preload(): Promise<void> {
    const ctx = this.getCtx();
    await Promise.all(
      SOUND_CATALOG.map(async (sound) => {
        if (this.buffers.has(sound.id)) return;
        try {
          const res = await fetch(sound.src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(sound.id, audioBuffer);
        } catch (err) {
          console.warn(`[audio] failed to preload "${sound.id}" (${sound.src}):`, err);
        }
      })
    );
  }
```

`play()` already returns early when `this.buffers.get(soundId)` is undefined, so a skipped sound simply produces no audio instead of crashing.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio-engine.ts
git commit -m "fix(audio): isolate per-sound preload failures so one bad file doesn't break the mixer"
```

---

### Task 3: Add the 7 looping ambient audio files

**Files:**
- Create: `public/sounds/ambient/rain.mp3`
- Create: `public/sounds/ambient/ocean.mp3`
- Create: `public/sounds/ambient/fire.mp3`
- Create: `public/sounds/ambient/birds.mp3`
- Create: `public/sounds/ambient/wind.mp3`
- Create: `public/sounds/ambient/thunder.mp3`
- Create: `public/sounds/ambient/water.mp3`

Source: free CC0 / royalty-free loops (e.g. Pixabay `https://pixabay.com/sound-effects/`, Mixkit `https://mixkit.co/free-sound-effects/`). Each should be a seamless loop, mono/stereo MP3, ideally ~30–60s and < ~1.5 MB.

- [ ] **Step 1: Download each loop into the ambient folder**

For each of the 7 ids, download a matching CC0 loop and save it under the exact filename above. Use the Bash tool, e.g.:

```bash
curl -L -o public/sounds/ambient/rain.mp3 "<CC0_RAIN_MP3_URL>"
```

Resolve a working direct-download URL per sound at execution time (the Pixabay/Mixkit asset pages expose a direct `.mp3` download link). Repeat for `ocean`, `fire`, `birds`, `wind`, `thunder`, `water`.

- [ ] **Step 2: Verify every file exists and is a real, non-trivial MP3**

Run (PowerShell):

```powershell
Get-ChildItem public/sounds/ambient/*.mp3 | Select-Object Name, Length
```

Expected: 7 files listed, each `Length` greater than ~50000 bytes (a few hundred bytes means an HTML error page was saved, not audio — re-download that one).

- [ ] **Step 3: Commit**

```bash
git add public/sounds/ambient/*.mp3
git commit -m "feat(sounds): add 7 looping ambient audio assets (CC0)"
```

---

### Task 4: Add thunder + water icons to SoundToggle

**Files:**
- Modify: `src/components/audio/sound-toggle.tsx`

- [ ] **Step 1: Update the icon imports and map**

Replace the import block and `SOUND_ICONS` map at the top of `src/components/audio/sound-toggle.tsx` with:

```tsx
import { cn } from '@/lib/utils';
import {
  CloudRain,
  Waves,
  Flame,
  Bird,
  Wind,
  CloudLightning,
  Droplets,
  Music,
  type LucideIcon,
} from 'lucide-react';

const SOUND_ICONS: Record<string, LucideIcon> = {
  rain: CloudRain,
  ocean: Waves,
  fire: Flame,
  birds: Bird,
  wind: Wind,
  thunder: CloudLightning,
  water: Droplets,
};
```

The rest of the component (props, JSX) is unchanged. `const Icon = SOUND_ICONS[id] ?? Music;` still provides a fallback, and `Music` is still imported and used by that fallback.

- [ ] **Step 2: Typecheck (also confirms the lucide icon names exist)**

Run: `npx tsc --noEmit`
Expected: no errors. If `CloudLightning` or `Droplets` is reported as a missing export, substitute the nearest available lucide icon (e.g. `Zap` for thunder, `Droplet` for water) and update both the import and the map.

- [ ] **Step 3: Commit**

```bash
git add src/components/audio/sound-toggle.tsx
git commit -m "feat(audio): add thunder + water icons to SoundToggle"
```

---

### Task 5: Create the SoundPopover component

**Files:**
- Create: `src/components/audio/sound-popover.tsx`

This is the only new UI. It renders a navbar icon button with an active-count badge; clicking opens a floating white panel anchored top-right containing master volume + mute, the 7 sound toggles, and a per-sound volume slider for each enabled sound. Click-outside and `Esc` close it. Mounting it is what triggers `use-audio-mixer` to preload + sync the engine.

- [ ] **Step 1: Create the component**

Create `src/components/audio/sound-popover.tsx` with exactly:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SoundToggle } from './sound-toggle';
import { VolumeSlider } from './volume-slider';
import { useAudioMixer } from '@/hooks/use-audio-mixer';
import { AMBIENT_SOUNDS } from '@/lib/sounds';

export function SoundPopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    channels,
    masterVolume,
    isMuted,
    setVolume,
    toggleChannel,
    setMasterVolume,
    toggleMute,
  } = useAudioMixer();

  const enabledCount = Object.values(channels).filter((ch) => ch.enabled).length;

  // Close on click-outside and Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full text-brand-text/60 hover:text-brand-text hover:bg-brand-light/40 transition-all"
        aria-label="Sound mixer"
        aria-expanded={open}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        {enabledCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-brand-dark text-white text-[10px] font-semibold leading-none">
            {enabledCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] p-4 !rounded-3xl">
          {/* Master volume + mute */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={toggleMute}
              className="shrink-0"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-red-400" />
              ) : (
                <Volume2 size={18} className="text-brand-text" />
              )}
            </button>
            <VolumeSlider
              value={masterVolume}
              onChange={setMasterVolume}
              label="Master"
              disabled={isMuted}
            />
          </div>

          <hr className="border-black/10 mb-3" />

          {/* Sound toggles */}
          <div className="grid grid-cols-4 gap-2">
            {AMBIENT_SOUNDS.map((sound) => (
              <SoundToggle
                key={sound.id}
                id={sound.id}
                label={sound.label}
                enabled={channels[sound.id]?.enabled ?? false}
                onToggle={() => toggleChannel(sound.id)}
              />
            ))}
          </div>

          {/* Per-sound volume sliders (only for enabled sounds) */}
          <div className="mt-3 space-y-2">
            {AMBIENT_SOUNDS.filter((s) => channels[s.id]?.enabled).map((sound) => (
              <VolumeSlider
                key={sound.id}
                value={channels[sound.id].volume}
                onChange={(v) => setVolume(sound.id, v)}
                label={sound.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/audio/sound-popover.tsx
git commit -m "feat(audio): add SoundPopover mixer panel component"
```

---

### Task 6: Mount SoundPopover in the navbar

**Files:**
- Modify: `src/components/ui/nav-bar.tsx`

- [ ] **Step 1: Import SoundPopover**

Add this import alongside the existing imports at the top of `src/components/ui/nav-bar.tsx`:

```tsx
import { SoundPopover } from '@/components/audio/sound-popover';
```

- [ ] **Step 2: Render it in the right-hand cluster**

In the right-hand `div` (currently the `<div className="flex items-center gap-2">` holding the auth control), add `<SoundPopover />` before the auth conditional so the block becomes:

```tsx
      <div className="flex items-center gap-2">
        <SoundPopover />
        {isSignedIn ? (
          <UserButton />
        ) : (
          <button
            onClick={() => openSignIn()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30 transition-all"
          >
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/nav-bar.tsx
git commit -m "feat(nav): mount SoundPopover sound mixer in navbar"
```

---

### Task 7: End-to-end verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server / preview**

Start the app with the preview tooling (`preview_start`, default Next dev). Open the timer page.

- [ ] **Step 2: Confirm the timer UI is unchanged**

Take a `preview_screenshot`. Confirm the mascot, "Let's focus together", `25:00`, START / reset, and "Today — sessions" bottom sheet look identical to before, with only a new sound icon added to the navbar's right side.

- [ ] **Step 3: Open the popover and play a sound**

`preview_click` the navbar sound icon → panel appears. Click the **Rain** toggle. If an audio-unlock prompt appears (suspended AudioContext), click it. Confirm via `preview_console_logs` there is no preload error for `rain`, and that rain audio is playing (engine channel active).

- [ ] **Step 4: Confirm simultaneous, independent channels**

Toggle **Thunder** and **Water** on as well. Confirm all three are enabled (the navbar badge reads `3`) and three separate volume sliders are shown. Drag the Thunder slider down and confirm only Thunder's percentage changes — the others stay put.

- [ ] **Step 5: Confirm master volume + mute**

Drag the Master slider and confirm overall level changes. Click the mute button → badge/engine reflects muted (master gain 0); unmute restores. 

- [ ] **Step 6: Confirm dismissal + persistence**

Press `Esc` (or click outside) → panel closes, audio keeps playing. Reopen → the same sounds are still enabled with their volumes. Navigate to Stats and back → audio continues (NavBar persists in the layout).

- [ ] **Step 7: Final build check**

Run: `npm run build`
Expected: build succeeds (this is the production typecheck + compile gate).

- [ ] **Step 8: Update CLAUDE.md implementation status**

Per the project's `update-claude-md` rule, add a short note under Implementation Status that the ambient sound mixer is now wired into the navbar (catalog = 7 ambient sounds; lo-fi dropped; `SoundPopover` mounted in `NavBar`).

```bash
git add CLAUDE.md
git commit -m "docs: note ambient sound mixer wired into navbar"
```

---

## Self-Review Notes

- **Spec coverage:** §4.1 catalog → Task 1; §4.2 resilient preload → Task 2; §4.3 assets → Task 3; §4.4 SoundPopover (+ icons) → Tasks 4–5; §4.5 navbar wiring → Task 6; §7 testing → Task 7. All covered.
- **Type consistency:** `AMBIENT_SOUNDS` (Task 1 export) is consumed in Task 5; `SoundToggle` / `VolumeSlider` prop shapes match their existing definitions; `useAudioMixer` return fields used in Task 5 match `use-audio-mixer.ts`.
- **No test runner:** intentional — project has none; verification is typecheck + lint + manual preview + production build, consistent with the spec's manual testing section. Adding a test framework is out of scope (YAGNI).
- **Known soft spot:** Task 3 download URLs are resolved at execution time (CC0 sources vary); Step 2 guards against saving HTML error pages by checking file size.
```
