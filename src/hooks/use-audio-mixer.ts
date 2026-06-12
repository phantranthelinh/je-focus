'use client';

import { useEffect } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { useAudioStore } from '@/stores/audio-store';
import { useShallow } from 'zustand/react/shallow';

export function useAudioMixer() {
  const store = useAudioStore(
    useShallow((s) => ({
      channels: s.channels,
      masterVolume: s.masterVolume,
      isMuted: s.isMuted,
      setVolume: s.setVolume,
      toggleChannel: s.toggleChannel,
      setMasterVolume: s.setMasterVolume,
      toggleMute: s.toggleMute,
      loadMix: s.loadMix,
      resetMix: s.resetMix,
    }))
  );

  // Preload all audio buffers once on mount
  useEffect(() => {
    audioEngine.preload();
  }, []);

  // Sync store state → AudioEngine
  useEffect(() => {
    const { channels, masterVolume, isMuted } = store;

    for (const [id, channel] of Object.entries(channels)) {
      if (channel.enabled && !isMuted) {
        if (!audioEngine.isPlaying(id)) {
          audioEngine.play(id, channel.volume);
        } else {
          audioEngine.setVolume(id, channel.volume);
        }
      } else {
        audioEngine.stop(id);
      }
    }

    audioEngine.setMasterVolume(isMuted ? 0 : masterVolume);
  }, [store.channels, store.masterVolume, store.isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  return {
    channels: store.channels,
    masterVolume: store.masterVolume,
    isMuted: store.isMuted,
    setVolume: store.setVolume,
    toggleChannel: store.toggleChannel,
    setMasterVolume: store.setMasterVolume,
    toggleMute: store.toggleMute,
    loadMix: store.loadMix,
    resetMix: store.resetMix,
  };
}
