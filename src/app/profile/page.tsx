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
