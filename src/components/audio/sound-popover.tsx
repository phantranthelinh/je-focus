'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Save, Trash2 } from 'lucide-react';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';
import { SoundToggle } from './sound-toggle';
import { VolumeSlider } from './volume-slider';
import { useAudioMixer } from '@/hooks/use-audio-mixer';
import { useAudioStore } from '@/stores/audio-store';
import { audioEngine } from '@/lib/audio-engine';
import { AMBIENT_SOUNDS } from '@/lib/sounds';
import { trpc } from '@/lib/trpc-client';

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

  const utils = trpc.useUtils();

  const { isSignedIn } = useAuth();
  const loadMix = useAudioStore((s) => s.loadMix);

  const [mixName, setMixName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: mixes } = trpc.sound.getMixes.useQuery(undefined, {
    enabled: !!isSignedIn && open,
  });

  const saveMixMutation = trpc.sound.saveMix.useMutation({
    onSuccess: () => {
      setMixName('');
      utils.sound.getMixes.invalidate();
    },
  });

  const deleteMixMutation = trpc.sound.deleteMix.useMutation({
    onMutate: ({ id }) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => utils.sound.getMixes.invalidate(),
    onError: () => utils.sound.getMixes.invalidate(),
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

  const enabledCount = Object.values(channels).filter((ch) => ch.enabled).length;

  // Warm the audio buffer cache when the user opens the mixer, so toggling a
  // sound feels instant. Audio is intentionally not preloaded on page load.
  useEffect(() => {
    if (open) audioEngine.preload();
  }, [open]);

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
              hideIcon
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
              {mixes === undefined ? null : mixes.length > 0 ? (
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
                        disabled={deletingId === mix.id}
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
        </div>
      )}
    </div>
  );
}
