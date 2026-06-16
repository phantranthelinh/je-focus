# Remaining Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add friend list management, a profile page, and a PWA install prompt to complete the JeFocus MVP.

**Architecture:** Three independent features delivered sequentially. Friend list extends the existing `friendRouter` and `leaderboard/page.tsx`. Profile page adds a new `/profile` route backed by the existing `user.updateProfile` tRPC mutation. PWA install is a client-only hook + nav button with no backend changes.

**Tech Stack:** Next.js 15 App Router · tRPC · Prisma + Neon PostgreSQL · Clerk (`@clerk/nextjs`) · Tailwind CSS v4 · lucide-react

---

## Key Conventions (read before touching any file)

- **Auth:** always `import { useAuthSafe as useAuth } from '@/lib/clerk-hooks'` — never import Clerk hooks directly.
- **tRPC client:** `import { trpc } from '@/lib/trpc-client'`
- **Design tokens (Tailwind):** `brand-coral` (#00d4a4), `brand-coral-active` (#00b48a), `brand-hairline` (#e5e5e5), `brand-muted` (#888888), `brand-text` (#0a0a0a), `brand-light` (#f7f7f7), `brand-surface` (#f7f7f7).
- **TypeScript:** `type` over `interface` everywhere.
- **No test framework** — verify with `npx tsc --noEmit` (must exit 0).
- **Commit after every task.**

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/server/routers/friend.ts` | Modify | Add `list` query |
| `src/app/leaderboard/page.tsx` | Modify | Show friend list with Remove button inside FriendsPanel |
| `src/hooks/use-pwa-install.ts` | Create | `beforeinstallprompt` hook |
| `src/components/ui/nav-bar.tsx` | Modify | Add Install button + Profile link |
| `src/app/profile/page.tsx` | Create | Display name update form |

---

## Task 1: friend.list backend endpoint

**Files:**
- Modify: `src/server/routers/friend.ts`

- [ ] **Step 1: Add `list` query to the friendRouter**

Open `src/server/routers/friend.ts`. The file currently ends with the `pendingRequests` procedure before the closing `});`. Add the `list` query **after** `pendingRequests` and **before** the closing `});`:

```ts
  list: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await ctx.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: ctx.userId }, { friendId: ctx.userId }],
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        friend: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return friendships.map((f) => ({
      friendshipId: f.id,
      user: f.userId === ctx.userId ? f.friend : f.user,
    }));
  }),
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0 with no output.

- [ ] **Step 3: Commit**

```bash
git add src/server/routers/friend.ts
git commit -m "feat(friend): add list query for accepted friends"
```

---

## Task 2: Friend list UI in leaderboard Friends tab

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

The `FriendsPanel` component lives inside this file. It currently shows: search form → pending requests. We add a "My Friends" section at the bottom.

- [ ] **Step 1: Add `friend.list` query + `remove` wiring inside `FriendsPanel`**

In `src/app/leaderboard/page.tsx`, inside the `FriendsPanel` function body, add these two lines after the existing `decline` mutation declaration:

```tsx
  const { data: friends, isLoading: friendsLoading } = trpc.friend.list.useQuery();

  const remove = trpc.friend.decline.useMutation({
    onSuccess: () => {
      utils.friend.list.invalidate();
      utils.leaderboard.friends.invalidate();
    },
  });
```

- [ ] **Step 2: Add "My Friends" section JSX at the bottom of FriendsPanel's return**

Inside `FriendsPanel`'s `return (...)`, after the pending requests block (after the closing `}`  of `{pending && pending.length > 0 && (...)}`) add:

```tsx
      {/* Current friends */}
      <div>
        <h3 className="text-sm font-medium text-brand-text mb-2">My Friends</h3>
        {friendsLoading ? (
          <p className="text-sm text-brand-muted">Loading…</p>
        ) : !friends || friends.length === 0 ? (
          <p className="text-sm text-brand-muted/60 italic">No friends yet. Add someone above!</p>
        ) : (
          <div className="divide-y divide-brand-hairline rounded-lg border border-brand-hairline overflow-hidden">
            {friends.map(({ friendshipId, user: u }) => (
              <div key={friendshipId} className="flex items-center gap-3 p-3 bg-white">
                <Avatar name={u.name ?? 'User'} image={u.image ?? null} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{u.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-brand-muted truncate">{u.email}</p>
                </div>
                <button
                  onClick={() => remove.mutate({ friendshipId })}
                  disabled={remove.isPending}
                  className="text-xs text-brand-muted hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
```

- [ ] **Step 3: Fix `decline` mutation input — it accepts `friendshipId`, not `id`**

The existing `decline` mutation in `friend.ts` expects `z.object({ friendshipId: z.string() })`. Verify the input schema in `src/server/routers/friend.ts`:

```ts
  decline: protectedProcedure
    .input(z.object({ friendshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const f = await ctx.prisma.friendship.findUnique({ where: { id: input.friendshipId } });
```

If it currently uses `id` instead of `friendshipId`, update both the input schema key and the `where` clause to use `friendshipId`. The call site in step 2 uses `remove.mutate({ friendshipId })` so the schema key must be `friendshipId`.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/leaderboard/page.tsx src/server/routers/friend.ts
git commit -m "feat(leaderboard): show friend list with remove button"
```

---

## Task 3: PWA install hook

**Files:**
- Create: `src/hooks/use-pwa-install.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-pwa-install.ts` with this exact content:

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setPrompt(null);
    }
  }, [prompt]);

  return { canInstall: !!prompt && !isInstalled, isInstalled, install };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-pwa-install.ts
git commit -m "feat(pwa): add usePwaInstall hook"
```

---

## Task 4: PWA install button in NavBar

**Files:**
- Modify: `src/components/ui/nav-bar.tsx`

The current nav-bar right cluster is: `<SoundPopover />` + sign-in/UserButton. We add an Install button that only renders when `canInstall` is true.

- [ ] **Step 1: Import the hook and Download icon**

At the top of `src/components/ui/nav-bar.tsx`, add to the existing imports:

```tsx
import { usePwaInstall } from '@/hooks/use-pwa-install';
```

And add `Download` to the lucide-react import line (it already imports `Timer, BarChart3, PenLine, Trophy`):

```tsx
import { Timer, BarChart3, PenLine, Trophy, Download } from 'lucide-react';
```

- [ ] **Step 2: Call the hook inside NavBar**

Inside the `NavBar` function body, after the existing hook calls add:

```tsx
  const { canInstall, install } = usePwaInstall();
```

- [ ] **Step 3: Add Install button to the right cluster**

In the right cluster `<div className="flex items-center gap-2">`, add the Install button **before** `<SoundPopover />`:

```tsx
        {canInstall && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30 transition-all"
            title="Install app"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/nav-bar.tsx
git commit -m "feat(pwa): show Install button in nav when installable"
```

---

## Task 5: Profile page

**Files:**
- Create: `src/app/profile/page.tsx`
- Modify: `src/components/ui/nav-bar.tsx`

Backend already has `user.profile` (query) and `user.updateProfile` (mutation accepting `{ name?: string }`).

- [ ] **Step 1: Create `src/app/profile/page.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc-client';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';
import { useClerkSafe } from '@/lib/clerk-hooks';
import Image from 'next/image';
import { Check, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerkSafe();

  const { data: profile, isLoading } = trpc.user.profile.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.profile.invalidate(),
  });

  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.name) return;
    updateMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-brand-text font-medium">Sign in to view your profile</p>
          <button
            onClick={() => openSignIn()}
            className="px-5 py-2.5 rounded-lg bg-brand-coral text-white text-sm hover:bg-brand-coral-active transition-colors"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-brand-surface flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-brand-muted" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-surface">
      <div className="max-w-md mx-auto px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-brand-text">Profile</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          {profile?.image ? (
            <Image
              src={profile.image}
              alt={profile.name ?? 'Avatar'}
              width={64}
              height={64}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-hairline flex items-center justify-center text-2xl font-semibold text-brand-muted">
              {(profile?.name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-brand-text">{profile?.name ?? 'Unnamed'}</p>
            <p className="text-sm text-brand-muted">{profile?.email}</p>
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-text" htmlFor="display-name">
            Display name
          </label>
          <p className="text-xs text-brand-muted">This name appears on the leaderboard.</p>
          <div className="flex gap-2">
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              maxLength={100}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-hairline bg-white text-brand-text outline-none focus:ring-1 focus:ring-brand-coral/40 transition-all"
            />
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || !name.trim() || name.trim() === profile?.name}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-brand-coral text-white hover:bg-brand-coral-active disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <Check size={14} />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-brand-hairline rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-brand-text">{profile?._count.timerSessions ?? 0}</p>
            <p className="text-xs text-brand-muted mt-1">Timer sessions</p>
          </div>
          <div className="bg-white border border-brand-hairline rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-brand-text">{profile?._count.soundMixes ?? 0}</p>
            <p className="text-xs text-brand-muted mt-1">Sound mixes saved</p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add Profile link to nav — replace the raw "Sign in" text button with a link when signed in**

In `src/components/ui/nav-bar.tsx`, add `User` to the lucide-react import:

```tsx
import { Timer, BarChart3, PenLine, Trophy, Download, User } from 'lucide-react';
```

Then add `Link` is already imported. In the right cluster, replace the `clerkEnabled && isSignedIn` block with:

```tsx
        {clerkEnabled && isSignedIn ? (
          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full transition-all',
                pathname === '/profile'
                  ? 'glass-strong text-brand-text'
                  : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30'
              )}
              title="Profile"
            >
              <User size={18} />
            </Link>
            <UserButton />
          </div>
        ) : (
          <button
            onClick={() => openSignIn()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-brand-text/60 hover:text-brand-text hover:bg-brand-light/30 transition-all"
          >
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx src/components/ui/nav-bar.tsx
git commit -m "feat(profile): display name editor + nav profile link"
```

---

## Task 6: Final push

- [ ] **Step 1: Push all commits**

```bash
git push
```

Expected: all 5 feature commits pushed to `origin/main`.
