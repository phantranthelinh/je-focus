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

### Audio Channels
- Ambient: rain, ocean, fire, birds, wind
- Lo-fi: lofi-chill, lofi-jazz, lofi-piano (each channel: independent volume)

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
