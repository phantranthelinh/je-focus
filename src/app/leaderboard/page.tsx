'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';
import { useClerkSafe } from '@/lib/clerk-hooks';
import { Trophy, Users, Search, UserPlus, Check, X, Clock } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { toast } from 'sonner';

type Tab = 'global' | 'friends';

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

function Avatar({ name, image, size = 36 }: { name: string; image: string | null; size?: number }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-hairline flex items-center justify-center text-brand-muted font-medium text-sm"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500 font-bold text-base">🥇</span>;
  if (rank === 2) return <span className="text-slate-400 font-bold text-base">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-base">🥉</span>;
  return <span className="text-brand-muted/60 text-sm tabular-nums w-6 text-center">{rank}</span>;
}

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  totalSec: number;
  sessions: number;
  isMe: boolean;
};

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-brand-muted">
        No sessions recorded yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-brand-hairline">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={clsx(
            'flex items-center gap-3 py-3 px-4 transition-colors',
            entry.isMe && 'bg-brand-coral/5'
          )}
        >
          <div className="w-8 flex justify-center shrink-0">
            <RankBadge rank={entry.rank} />
          </div>

          <Avatar name={entry.name} image={entry.image} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={clsx('text-sm font-medium truncate', entry.isMe ? 'text-brand-coral' : 'text-brand-text')}>
                {entry.name}
              </span>
              {entry.isMe && (
                <span className="text-xs text-brand-coral bg-brand-coral/10 px-1.5 py-0.5 rounded-full shrink-0">you</span>
              )}
            </div>
            <span className="text-xs text-brand-muted">{entry.sessions} sessions</span>
          </div>

          <div className="flex items-center gap-1 text-brand-muted shrink-0">
            <Clock size={13} />
            <span className="text-sm tabular-nums">{formatTime(entry.totalSec)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FriendsPanel() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);

  const utils = trpc.useUtils();

  const { data: searchResult, refetch: doSearch, isFetching: isSearching } =
    trpc.friend.search.useQuery(
      { email },
      { enabled: false, retry: false }
    );

  const { data: pending } = trpc.friend.pendingRequests.useQuery();
  const { data: sent } = trpc.friend.sentRequests.useQuery();

  const sendRequest = trpc.friend.sendRequest.useMutation({
    onSuccess: () => {
      utils.friend.search.invalidate();
      utils.friend.sentRequests.invalidate();
      toast.success('Friend request sent!');
    },
    onError: () => toast.error('Could not send friend request'),
  });
  const accept = trpc.friend.accept.useMutation({
    onSuccess: () => {
      utils.friend.pendingRequests.invalidate();
      utils.leaderboard.friends.invalidate();
      toast.success('Friend added!');
    },
    onError: () => toast.error('Could not accept request'),
  });
  const decline = trpc.friend.decline.useMutation({
    onSuccess: () => utils.friend.pendingRequests.invalidate(),
    onError: () => toast.error('Could not decline request'),
  });
  const cancel = trpc.friend.decline.useMutation({
    onSuccess: () => {
      utils.friend.sentRequests.invalidate();
      utils.friend.search.invalidate();
    },
    onError: () => toast.error('Could not cancel request'),
  });

  const { data: friends, isLoading: friendsLoading } = trpc.friend.list.useQuery();

  const remove = trpc.friend.decline.useMutation({
    onSuccess: () => {
      utils.friend.list.invalidate();
      utils.leaderboard.friends.invalidate();
      toast.success('Friend removed');
    },
    onError: () => toast.error('Could not remove friend'),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSearching(true);
    doSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <p className="text-sm text-brand-muted mb-3">Add friends by email to compete together.</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-hairline bg-white text-brand-text placeholder:text-brand-muted/50 outline-none focus:ring-1 focus:ring-brand-coral/40 transition-all"
          />
          <button
            type="submit"
            disabled={isSearching || !email.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-brand-coral text-white hover:bg-brand-coral-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={14} />
            Search
          </button>
        </form>

        {searching && searchResult !== undefined && (
          <div className="mt-3 p-3 rounded-lg border border-brand-hairline bg-white">
            {searchResult === null ? (
              <p className="text-sm text-brand-muted">No user found with that email.</p>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar name={searchResult.name ?? 'User'} image={searchResult.image ?? null} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{searchResult.name ?? 'Unnamed user'}</p>
                  <p className="text-xs text-brand-muted truncate">{searchResult.email}</p>
                </div>
                {searchResult.friendshipStatus === 'accepted' ? (
                  <span className="text-xs text-brand-coral bg-brand-coral/10 px-2 py-1 rounded-full">Friends</span>
                ) : searchResult.friendshipStatus === 'pending' ? (
                  <span className="text-xs text-brand-muted bg-brand-hairline px-2 py-1 rounded-full">Pending</span>
                ) : (
                  <button
                    onClick={() => sendRequest.mutate({ friendId: searchResult.id })}
                    disabled={sendRequest.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-coral text-white hover:bg-brand-coral-active transition-colors disabled:opacity-50"
                  >
                    <UserPlus size={12} />
                    Add
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sent requests */}
      {sent && sent.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-brand-text mb-2">Sent requests</h3>
          <div className="divide-y divide-brand-hairline rounded-lg border border-brand-hairline overflow-hidden">
            {sent.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-white">
                <Avatar name={req.friend.name ?? 'User'} image={req.friend.image ?? null} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{req.friend.name ?? 'Unnamed user'}</p>
                  <p className="text-xs text-brand-muted truncate">{req.friend.email}</p>
                </div>
                <button
                  onClick={() => cancel.mutate({ friendshipId: req.id })}
                  disabled={cancel.isPending}
                  className="text-xs text-brand-muted hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pending && pending.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-brand-text mb-2">Pending requests</h3>
          <div className="divide-y divide-brand-hairline rounded-lg border border-brand-hairline overflow-hidden">
            {pending.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-white">
                <Avatar name={req.user.name ?? 'User'} image={req.user.image ?? null} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{req.user.name ?? 'Unnamed user'}</p>
                  <p className="text-xs text-brand-muted truncate">{req.user.email}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => accept.mutate({ friendshipId: req.id })}
                    className="p-1.5 rounded-lg bg-brand-coral/10 text-brand-coral hover:bg-brand-coral hover:text-white transition-colors"
                    title="Accept"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => decline.mutate({ friendshipId: req.id })}
                    className="p-1.5 rounded-lg bg-brand-hairline text-brand-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Decline"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerkSafe();

  const { data: globalData, isLoading: globalLoading } = trpc.leaderboard.global.useQuery(
    undefined,
    { enabled: !!isSignedIn }
  );
  const { data: friendsData, isLoading: friendsLoading } = trpc.leaderboard.friends.useQuery(
    undefined,
    { enabled: !!isSignedIn && tab === 'friends' }
  );

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy size={40} className="mx-auto text-brand-coral" />
          <p className="text-brand-text font-medium">Sign in to view the leaderboard</p>
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

  return (
    <main className="min-h-screen bg-brand-surface">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Leaderboard</h1>
          <p className="text-sm text-brand-muted mt-1">Top focus sessions by total time</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-brand-hairline/50 rounded-xl">
          <button
            onClick={() => setTab('global')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg transition-all font-medium',
              tab === 'global'
                ? 'bg-white text-brand-text shadow-sm'
                : 'text-brand-muted hover:text-brand-text'
            )}
          >
            <Trophy size={15} />
            Global
          </button>
          <button
            onClick={() => setTab('friends')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg transition-all font-medium',
              tab === 'friends'
                ? 'bg-white text-brand-text shadow-sm'
                : 'text-brand-muted hover:text-brand-text'
            )}
          >
            <Users size={15} />
            Friends
          </button>
        </div>

        {tab === 'global' && (
          <div className="bg-white border border-brand-hairline rounded-xl overflow-hidden">
            {globalLoading ? (
              <div className="py-12 text-center text-brand-muted text-sm">Loading…</div>
            ) : (
              <LeaderboardTable entries={globalData ?? []} />
            )}
          </div>
        )}

        {tab === 'friends' && (
          <div className="space-y-4">
            <div className="bg-white border border-brand-hairline rounded-xl overflow-hidden">
              {friendsLoading ? (
                <div className="py-12 text-center text-brand-muted text-sm">Loading…</div>
              ) : (
                <LeaderboardTable entries={friendsData ?? []} />
              )}
            </div>
            <div className="bg-white border border-brand-hairline rounded-xl p-4">
              <FriendsPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
