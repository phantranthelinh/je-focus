# CLAUDE.md — JeFocus

## Project Overview

Pomodoro Timer web app (JeFocus) — multi-channel ambient audio mixer, Glassmorphism UI (`#D0FFD6`), social features. Stack: Next.js 15 App Router, tRPC, Zustand, Howler.js, Prisma + PostgreSQL, Clerk (`@clerk/nextjs`), Tailwind CSS.

## Hard Rules — "The Law"

> Rules in `.claude/rules/` — auto-loaded.

- [token-efficiency.md](.claude/rules/token-efficiency.md)
- [modularization.md](.claude/rules/modularization.md)
- [ux.md](.claude/rules/ux.md)
- [no-placeholders.md](.claude/rules/no-placeholders.md)
- [update-claude-md.md](.claude/rules/update-claude-md.md)

## Tech Stack

Next.js 15 · tRPC · Zustand · Howler.js · Prisma + PostgreSQL · Clerk (`@clerk/nextjs`, Google/GitHub OAuth) · Tailwind CSS · next-pwa · lucide-react · clsx · tailwind-merge

### Auth (Clerk)
- `<ClerkProvider>` wraps app in `src/app/layout.tsx`; `<SignInButton>`/`<UserButton>` in `src/components/ui/nav-bar.tsx`.
- `src/middleware.ts` — `clerkMiddleware`; only `/dashboard(.*)` is protected via `auth.protect()`.
- `src/server/context.ts` — `auth()` reads `userId`, upserts `User` (Prisma `User.id` = Clerk userId).
- Env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client, **inlined at build time** — must be a Docker build-arg, see `Dockerfile`), `CLERK_SECRET_KEY` (server, runtime).
- **"Development mode" badge**: rendered by Clerk whenever `pk_test_`/`sk_test_` (dev instance) keys are used — not removable via CSS/`appearance`. To remove it, switch to a Production instance and use `pk_live_`/`sk_live_` keys (requires custom domain + DNS in Clerk Dashboard). Production Docker build:
  ```bash
  docker build \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
    -t jefocus .
  # CLERK_SECRET_KEY=sk_live_xxx passed as a runtime env var (NOT a build-arg)
  ```

## Architecture

### Key Patterns
- `src/server/routers/` — tRPC routers by domain (timer, sound, user, friend, leaderboard)
- `src/stores/` — 3 Zustand stores: timer-store, audio-store, ui-store
- `src/hooks/` — Custom hooks wrapping stores + side effects
- `src/components/ui/` — Reusable Glassmorphism primitives
- `type` over `interface` for all TypeScript definitions

### Animation strategy (perf)
- **framer-motion is code-split via `LazyMotion`** (`src/app/providers.tsx`, `strict` mode): use the `m` component (NOT `motion`) in client components. The ~30kb feature engine (`domAnimation`) loads async after first paint; `strict` throws if `motion.*` sneaks in. Interactive/exit animations (controls, settings panel, daily-tracker bottom sheet) stay in framer.
- **Always-on / enter-only animations are CSS keyframes** in `globals.css` (`.mascot-float-*`, `.mascot-enter`, `.animate-fade-in-up`), GPU-composited, no JS rAF loop — used by `Mascot` and the timer-page status text. Replay on change via React `key`. Respects `prefers-reduced-motion`.
- `next.config.ts` `experimental.optimizePackageImports` tree-shakes `framer-motion` + `lucide-react`.

### Audio Channels
- Ambient (7, each channel: independent volume, multiple play simultaneously): rain, ocean, fire, birds, wind, thunder, water (`SOUND_CATALOG` in `src/lib/sounds.ts`)
- Lo-fi entries were dropped from the catalog (UI doesn't surface them). `LOFI_SOUNDS` is now `[]`.
- **Lazy audio loading (perf):** `useAudioMixer` does **NOT** preload on mount — it lives in the navbar (every page), so eager preload would pull ~9.2MB of mp3 on first paint for users who never open the mixer. Buffers load on demand via `audioEngine.ensureLoaded()` (fetch+decode, deduped by in-flight `loading` map + `starting` set to prevent double-play). `play()` lazy-loads its own buffer; `SoundPopover` calls `audioEngine.preload()` on open to warm all 7. Verified: 0 `/sounds/` requests on load, 7 on mixer-open.
- **Mixer UI wired into navbar** via `src/components/audio/sound-popover.tsx` (`<SoundPopover />` in `nav-bar.tsx` right cluster) — icon button + active-count badge opens a floating panel (master volume, mute, 7 toggles, per-sound sliders). Reuses `useAudioMixer` + `SoundToggle` + `VolumeSlider`. Timer page unchanged. `ensureLoaded()` isolates per-file failures (resolves `null`).
- Audio assets in `public/sounds/ambient/*.mp3`: 6 are Ogg/Vorbis bytes saved as `.mp3` (Chrome `decodeAudioData` sniffs content; **Safari can't decode Vorbis** → those 6 are silently skipped there); `thunder.mp3` is true MP3. `ocean.mp3` is CC BY 3.0 (attribution required); the rest are CC0/public-domain.

### Timer Presets
- Pomodoro: 25/5/15min (4 rounds) · Deep Work: 50/10min · Quick: 15/3min · Custom

## Implementation Status

> **Update after each task.**

### Phase 4 — Integration & PWA (COMPLETE — MVP done)

### Completed (by layer)

**Foundation:** `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`

**App shell:** `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/globals.css` (Tailwind v4 @theme, .glass/.glass-strong, rank color tokens)

**Pages (Phase 4):** `src/app/page.tsx` (timer), `src/app/dashboard/page.tsx` (stats+history), `src/app/leaderboard/page.tsx` (rankings+friends)

**PWA (Phase 4):** `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/sounds/alert.mp3`, `next.config.ts` (withPWA + turbopack: {}: CacheFirst sounds, NetworkFirst tRPC, StaleWhileRevalidate images)

**Database:** `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`

**Stores:** `src/stores/timer-store.ts`, `src/stores/audio-store.ts`, `src/stores/ui-store.ts`

**Hooks:** `src/hooks/use-timer.ts`, `src/hooks/use-audio-mixer.ts`, `src/hooks/use-notification.ts`, `src/hooks/use-service-worker.ts`

**tRPC Routers:** `src/server/routers/{timer,sound,user,friend,leaderboard,root}.ts`

**Components:** `src/components/social/{stats-card,history-chart,leaderboard-table}.tsx`

### Available Exports
- `prisma` ← `@/lib/prisma`
- `Providers` ← `@/app/providers`
- `SOUND_CATALOG`, `AMBIENT_SOUNDS`, `LOFI_SOUNDS` ← `@/lib/sounds`
- `TIMER_PRESETS` ← `@/lib/presets`
- `useTimerStore`, `useAudioStore`, `useUIStore` ← `@/stores/*`
- `useTimer`, `useAudioMixer`, `useNotification`, `useServiceWorker` ← `@/hooks/*`
- `appRouter`, `AppRouter` ← `@/server/routers/root`

### Key Types
- `SoundCategory` — `'ambient' | 'lofi'`
- `SoundDefinition` — `{ id, label, category, src }`
- `PresetKey` — `'pomodoro' | 'deepwork' | 'quick' | 'custom'`
- `TimerPreset` — `{ key, label, focusMinutes, shortBreakMinutes, longBreakMinutes, rounds }`
- `TimerPhase` — `'focus' | 'shortBreak' | 'longBreak'`
- `AudioChannel` — `{ soundKey, volume, enabled }`
- `LeaderboardEntry` — `{ rank, userId, name, image, totalSec, sessions }`

### Prisma Notes
- `PrismaClient` from `@prisma/client` (provider: `prisma-client-js`)
- Friendship: `userId` (sender) + `friendId` (receiver) + `status: 'pending'|'accepted'`
- Accepted friendships: bidirectional rows in single `$transaction`
