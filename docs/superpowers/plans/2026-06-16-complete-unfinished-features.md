# Complete Unfinished Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Preset Switcher, Sound Preset UI, and Guest→Auth Session Migration.

**Architecture:** Three independent features that share no state. Preset Switcher is pure UI wired to existing `useTimerStore.setPreset`. Sound Preset UI calls existing tRPC `sound.*` endpoints. Migration runs once on sign-in via a new hook mounted in `providers.tsx`.

**Tech Stack:** Next.js 15 App Router, tRPC, Zustand (`useTimerStore`, `useAudioStore`, `useTrackingStore`), Clerk (`useAuth`), Tailwind CSS, Prisma.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/stores/tracking-store.ts` | Modify | Add `clearAll()` action |
| `src/server/routers/timer.ts` | Modify | Add `migrateSessions` procedure |
| `src/hooks/use-auth-migration.ts` | Create | Watch sign-in, migrate guest sessions |
| `src/app/providers.tsx` | Modify | Mount migration hook |
| `src/components/timer/preset-switcher.tsx` | Create | Pomodoro/Deep Work/Quick pill buttons |
| `src/app/page.tsx` | Modify | Render `<PresetSwitcher />` |
| `src/components/audio/sound-popover.tsx` | Modify | Add save/load preset section |

---

## Task 1: Add `clearAll()` to tracking-store

**Files:**
- Modify: `src/stores/tracking-store.ts`

- [ ] **Step 1: Add `clearAll` to `TrackingActions` type and implement it**

  Open `src/stores/tracking-store.ts`. Add `clearAll` to the `TrackingActions` type and implement it in the store:

  ```ts
  type TrackingActions = {
    recordSession: (totalSec: number) => void;
    getRecentDays: (n: number) => Array<{ date: string } & DayRecord>;
    clearAll: () => void;
  };
  ```

  Inside the `create()(persist(...))` body, add after `getRecentDays`:

  ```ts
  clearAll: () => set({ dailyLog: {} }),
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/stores/tracking-store.ts
  git commit -m "feat(store): add clearAll() to tracking-store"
  ```

---

## Task 2: Add `migrateSessions` tRPC endpoint

**Files:**
- Modify: `src/server/routers/timer.ts`

- [ ] **Step 1: Add `migrateSessions` procedure to the timer router**

  Open `src/server/routers/timer.ts`. Add this procedure inside the `router({...})` object, after the `dailyChart` procedure:

  ```ts
  migrateSessions: protectedProcedure
    .input(
      z.object({
        sessions: z.array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            totalFocusSec: z.number().int().positive(),
            sessionCount: z.number().int().positive(),
          })
        ).min(1).max(365),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rows = input.sessions.map(({ date, totalFocusSec }) => {
        const [y, m, d] = date.split('-').map(Number);
        const completedAt = new Date(y, m - 1, d, 12, 0, 0);
        return {
          userId: ctx.userId,
          preset: 'migrated',
          focusMin: 25,
          breakMin: 5,
          rounds: 1,
          totalFocusSec,
          completedAt,
        };
      });

      await ctx.prisma.timerSession.createMany({
        data: rows,
        skipDuplicates: false,
      });

      return { migrated: rows.length };
    }),
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/server/routers/timer.ts
  git commit -m "feat(api): add timer.migrateSessions endpoint for guest→auth migration"
  ```

---

## Task 3: Create `use-auth-migration` hook

**Files:**
- Create: `src/hooks/use-auth-migration.ts`

- [ ] **Step 1: Create the hook file**

  Create `src/hooks/use-auth-migration.ts` with this content:

  ```ts
  'use client';

  import { useEffect, useRef } from 'react';
  import { useAuth } from '@clerk/nextjs';
  import { trpc } from '@/lib/trpc-client';
  import { useTrackingStore } from '@/stores/tracking-store';

  export function useAuthMigration() {
    const { userId } = useAuth();
    const prevUserId = useRef<string | null | undefined>(undefined);
    const migrateMutation = trpc.timer.migrateSessions.useMutation();

    useEffect(() => {
      const wasSignedOut = !prevUserId.current;
      const isNowSignedIn = !!userId;

      if (wasSignedOut && isNowSignedIn) {
        const migrationKey = `migration_done_${userId}`;
        if (localStorage.getItem(migrationKey)) {
          prevUserId.current = userId;
          return;
        }

        const dailyLog = useTrackingStore.getState().dailyLog;
        const sessions = Object.entries(dailyLog)
          .filter(([, record]) => record.totalSec > 0)
          .map(([date, record]) => ({
            date,
            totalFocusSec: record.totalSec,
            sessionCount: record.sessions,
          }));

        if (sessions.length > 0) {
          migrateMutation.mutate(
            { sessions },
            {
              onSuccess: () => {
                useTrackingStore.getState().clearAll();
                localStorage.setItem(migrationKey, '1');
              },
            }
          );
        } else {
          localStorage.setItem(migrationKey, '1');
        }
      }

      prevUserId.current = userId;
    }, [userId, migrateMutation]);
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/hooks/use-auth-migration.ts
  git commit -m "feat(hooks): add use-auth-migration hook"
  ```

---

## Task 4: Mount migration hook in `providers.tsx`

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Create an inner client component that calls the hook**

  The hook uses `trpc` (which requires `trpc.Provider` to be an ancestor), so it must live _inside_ the provider tree. Add a small `MigrationRunner` component inside `providers.tsx` and render it as a child:

  Open `src/app/providers.tsx`. Add the import and component:

  ```ts
  'use client';

  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { httpBatchLink } from '@trpc/client';
  import { LazyMotion } from 'framer-motion';
  import { trpc } from '@/lib/trpc-client';
  import { useState } from 'react';
  import { useAuthMigration } from '@/hooks/use-auth-migration';

  const loadMotionFeatures = () =>
    import('framer-motion').then((mod) => mod.domAnimation);

  function getBaseUrl() {
    if (typeof window !== 'undefined') return '';
    return `http://localhost:${process.env.PORT ?? 3000}`;
  }

  function MigrationRunner() {
    useAuthMigration();
    return null;
  }

  export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
          }),
        ],
      })
    );

    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <LazyMotion features={loadMotionFeatures} strict>
            <MigrationRunner />
            {children}
          </LazyMotion>
        </QueryClientProvider>
      </trpc.Provider>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/providers.tsx
  git commit -m "feat(providers): mount auth migration hook"
  ```

---

## Task 5: Create `PresetSwitcher` component

**Files:**
- Create: `src/components/timer/preset-switcher.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/timer/preset-switcher.tsx`:

  ```tsx
  'use client';

  import { useTimerStore } from '@/stores/timer-store';
  import { TIMER_PRESETS, PresetKey } from '@/lib/presets';
  import { clsx } from 'clsx';

  const PRESET_KEYS: PresetKey[] = ['pomodoro', 'deepwork', 'quick'];

  export function PresetSwitcher() {
    const preset = useTimerStore((s) => s.preset);
    const isRunning = useTimerStore((s) => s.isRunning);
    const setPreset = useTimerStore((s) => s.setPreset);

    return (
      <div className="flex items-center gap-2">
        {PRESET_KEYS.map((key) => {
          const isActive = preset === key;
          return (
            <button
              key={key}
              onClick={() => setPreset(key)}
              disabled={isRunning}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive
                  ? 'bg-green-300/60 text-black/80 shadow-sm'
                  : 'bg-white/30 text-black/50 hover:bg-white/50 hover:text-black/70',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
            >
              {TIMER_PRESETS[key].label}
            </button>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/timer/preset-switcher.tsx
  git commit -m "feat(timer): add PresetSwitcher component"
  ```

---

## Task 6: Add `PresetSwitcher` to timer page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import and render `PresetSwitcher`**

  Open `src/app/page.tsx`. Add the import:

  ```ts
  import { PresetSwitcher } from '@/components/timer/preset-switcher';
  ```

  Add `<PresetSwitcher />` between `<TimerDisplay>` and `<TimerControls>` in the JSX:

  ```tsx
  <TimerDisplay
    remainingSeconds={remainingSeconds}
    mode={mode}
  />

  <PresetSwitcher />

  {/* Controls */}
  <TimerControls
    isRunning={isRunning}
    onStart={handleStart}
    onPause={pause}
    onReset={reset}
  />
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/page.tsx
  git commit -m "feat(timer): render PresetSwitcher on timer page"
  ```

---

## Task 7: Add Sound Preset UI to `SoundPopover`

**Files:**
- Modify: `src/components/audio/sound-popover.tsx`

The `sound.getMixes` endpoint returns channels with `soundKey` field. `useAudioStore.loadMix` expects `AudioChannel[]` with `id` field. We map `soundKey → id` when loading.

- [ ] **Step 1: Add imports and Clerk hook, tRPC hooks at top of `SoundPopover`**

  Open `src/components/audio/sound-popover.tsx`. Replace the import block at the top with:

  ```ts
  'use client';

  import { useEffect, useRef, useState } from 'react';
  import { Volume2, VolumeX, Save, Trash2 } from 'lucide-react';
  import { useAuth } from '@clerk/nextjs';
  import { SoundToggle } from './sound-toggle';
  import { VolumeSlider } from './volume-slider';
  import { useAudioMixer } from '@/hooks/use-audio-mixer';
  import { useAudioStore } from '@/stores/audio-store';
  import { audioEngine } from '@/lib/audio-engine';
  import { AMBIENT_SOUNDS } from '@/lib/sounds';
  import { trpc } from '@/lib/trpc-client';
  ```

- [ ] **Step 2: Add state and tRPC hooks inside the `SoundPopover` function body**

  Inside the `SoundPopover` function, after the existing `useAudioMixer()` destructure, add:

  ```ts
  const { isSignedIn } = useAuth();
  const loadMix = useAudioStore((s) => s.loadMix);
  // `channels` is already available from useAudioMixer() above

  const [mixName, setMixName] = useState('');

  const { data: mixes, refetch: refetchMixes } = trpc.sound.getMixes.useQuery(undefined, {
    enabled: !!isSignedIn && open,
  });

  const saveMixMutation = trpc.sound.saveMix.useMutation({
    onSuccess: () => {
      setMixName('');
      refetchMixes();
    },
  });

  const deleteMixMutation = trpc.sound.deleteMix.useMutation({
    onSuccess: () => refetchMixes(),
  });

  const handleSaveMix = () => {
    const name = mixName.trim();
    if (!name) return;
    const channelsToSave = Object.values(channels).map((ch) => ({
      soundKey: ch.id,
      volume: ch.volume,
      enabled: ch.enabled,
    }));
    saveMixMutation.mutate({ name, channels: channelsToSave });
  };

  const handleLoadMix = (mix: NonNullable<typeof mixes>[number]) => {
    loadMix(mix.channels.map((ch) => ({
      id: ch.soundKey,
      volume: ch.volume,
      enabled: ch.enabled,
    })));
  };
  ```

- [ ] **Step 3: Add the preset section JSX at the bottom of the popover panel**

  Inside the `{open && (...)}` block, after the per-sound sliders `</div>`, add:

  ```tsx
  {/* Sound Presets */}
  <hr className="border-black/10 my-3" />
  {isSignedIn ? (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-black/50 uppercase tracking-wide">Presets</p>

      {/* Save current mix */}
      <div className="flex gap-2">
        <input
          type="text"
          value={mixName}
          onChange={(e) => setMixName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveMix()}
          placeholder="Mix name…"
          maxLength={80}
          className="flex-1 min-w-0 px-2 py-1 text-sm rounded-lg bg-white/40 border border-black/10 outline-none placeholder:text-black/30"
        />
        <button
          onClick={handleSaveMix}
          disabled={!mixName.trim() || saveMixMutation.isPending}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-sm rounded-lg bg-green-300/60 text-black/70 hover:bg-green-300/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Save mix"
        >
          <Save size={14} />
        </button>
      </div>

      {/* Saved mixes list */}
      {mixes && mixes.length > 0 ? (
        <ul className="space-y-1">
          {mixes.slice(0, 5).map((mix) => (
            <li key={mix.id} className="flex items-center gap-2">
              <button
                onClick={() => handleLoadMix(mix)}
                className="flex-1 min-w-0 text-left text-sm px-2 py-1 rounded-lg bg-white/30 hover:bg-white/50 text-black/70 truncate transition-all"
              >
                {mix.name}
              </button>
              <button
                onClick={() => deleteMixMutation.mutate({ id: mix.id })}
                disabled={deleteMixMutation.isPending}
                className="shrink-0 p-1 rounded-lg text-black/30 hover:text-red-400 transition-colors"
                aria-label={`Delete ${mix.name}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-black/40 italic">No saved mixes yet</p>
      )}
    </div>
  ) : (
    <p className="text-xs text-black/40 text-center">Sign in to save mixes</p>
  )}
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/audio/sound-popover.tsx
  git commit -m "feat(audio): add sound preset save/load UI to SoundPopover"
  ```

---

## Final Verification

- [ ] **Run dev server and manually test all 3 features**

  ```bash
  npm run dev
  ```

  Check:
  1. Timer page shows Pomodoro / Deep Work / Quick buttons; clicking switches preset; buttons disabled while running.
  2. Sound mixer popover (click speaker icon in navbar):
     - Guest: shows "Sign in to save mixes"
     - Signed in: shows name input + Save button + list of saved mixes; Load applies mix; Delete removes it.
  3. Guest→Auth migration: open app, complete a timer session as guest, then sign in — check DB has the migrated session.

- [ ] **Final commit if any cleanup needed**

  ```bash
  git add -p
  git commit -m "chore: final cleanup after feature implementation"
  ```
