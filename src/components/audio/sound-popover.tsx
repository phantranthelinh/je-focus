'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SoundToggle } from './sound-toggle';
import { VolumeSlider } from './volume-slider';
import { useAudioMixer } from '@/hooks/use-audio-mixer';
import { audioEngine } from '@/lib/audio-engine';
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
        </div>
      )}
    </div>
  );
}
