'use client';

import { useEffect } from 'react';
import { TimerDisplay } from '@/components/timer/timer-display';
import { TimerControls } from '@/components/timer/timer-controls';
import { PresetSwitcher } from '@/components/timer/preset-switcher';
import { Mascot } from '@/components/timer/mascot';
import { DailyTracker } from '@/components/timer/daily-tracker';
import { useTimer } from '@/hooks/use-timer';
import { useNotification } from '@/hooks/use-notification';

export default function TimerPage() {
  const {
    mode,
    totalSeconds,
    remainingSeconds,
    currentRound,
    maxRounds,
    isRunning,
    start,
    pause,
    reset,
  } = useTimer();

  const { requestPermission, notifyTimerComplete } = useNotification();

  const handleStart = () => {
    requestPermission();
    start();
  };

  useEffect(() => {
    if (remainingSeconds === 0 && mode !== 'idle') {
      notifyTimerComplete(mode);
    }
  }, [remainingSeconds, mode, notifyTimerComplete]);

  // Dynamic Status Text Logic
  let statusText = "Let's focus together";
  if (isRunning) {
    const progress = (totalSeconds - remainingSeconds) / totalSeconds;
    if (progress > 0.8) statusText = "Almost there!";
    else if (progress > 0.1) statusText = "Keep going!";
  } else if (remainingSeconds === 0 && currentRound >= maxRounds) {
    statusText = "You did it!";
  }

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-500 flex justify-center items-center">
      <main className="relative z-10 w-full max-w-sm mx-auto px-4 flex flex-col items-center justify-center gap-6 min-h-screen">
        {/* Mascot */}
        <Mascot
          currentRound={currentRound}
          maxRounds={maxRounds}
          isRunning={isRunning}
          mode={mode}
        />

        {/* key remounts on text change so the fade-in-up animation replays */}
        <p
          key={statusText}
          className="animate-fade-in-up text-lg font-medium text-brand-muted tracking-wide"
        >
          {statusText}
        </p>

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

      </main>

      {/* Daily Tracking Bottom Sheet — fixed overlay, works for all users */}
      <DailyTracker />
    </div>
  );
}
