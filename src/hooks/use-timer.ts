'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/stores/timer-store';
import { useTrackingStore } from '@/stores/tracking-store';
import { TIMER_PRESETS } from '@/lib/presets';
import { trpc } from '@/lib/trpc-client';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';

export function useTimer() {
  const store = useTimerStore();
  const { isSignedIn } = useAuth();
  const recordSession = useTrackingStore((s) => s.recordSession);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeMutation = trpc.timer.complete.useMutation();
  const completeMutateRef = useRef(completeMutation.mutate);

  useEffect(() => {
    completeMutateRef.current = completeMutation.mutate;
  });

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick interval management
  useEffect(() => {
    if (store.isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick();
      }, 1000);
    } else {
      clearTick();
    }

    return clearTick;
  }, [store.isRunning, clearTick]);

  // Detect timer completion (remainingSeconds hits 0)
  useEffect(() => {
    if (store.remainingSeconds === 0 && store.mode !== 'idle') {
      const state = useTimerStore.getState();

      // Save completed focus session
      if (state.mode === 'focus') {
        // Always record locally (works for guests too)
        recordSession(state.totalSeconds);

        // Also persist to server if authenticated
        if (isSignedIn) {
          const breakMin =
            state.preset === 'custom'
              ? state.customConfig.breakMin
              : TIMER_PRESETS[state.preset].shortBreakMinutes;

          completeMutateRef.current({
            preset: state.preset,
            focusMin: Math.round(state.totalSeconds / 60),
            breakMin,
            rounds: state.currentRound,
            totalFocusSec: state.totalSeconds,
          });
        }
      }

      // Switch to next mode
      state.switchToNextMode();
    }
  }, [store.remainingSeconds, store.mode, isSignedIn, recordSession]);

  return {
    mode: store.mode,
    preset: store.preset,
    totalSeconds: store.totalSeconds,
    remainingSeconds: store.remainingSeconds,
    currentRound: store.currentRound,
    maxRounds: store.maxRounds,
    isRunning: store.isRunning,
    start: store.start,
    pause: store.pause,
    reset: store.reset,
    setPreset: store.setPreset,
    setCustomConfig: store.setCustomConfig,
  };
}
