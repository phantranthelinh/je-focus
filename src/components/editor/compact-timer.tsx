'use client';

import { useTimer } from '@/hooks/use-timer';
import { useNotification } from '@/hooks/use-notification';
import { useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const MODE_LABELS: Record<string, string> = {
  focus: 'Focus',
  break: 'Break',
  longBreak: 'Long Break',
  idle: 'Ready',
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function CompactTimer() {
  const {
    mode,
    remainingSeconds,
    isRunning,
    start,
    pause,
    reset,
  } = useTimer();

  const { requestPermission, notifyTimerComplete } = useNotification();

  useEffect(() => {
    if (remainingSeconds === 0 && mode !== 'idle') {
      notifyTimerComplete(mode);
    }
  }, [remainingSeconds, mode, notifyTimerComplete]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const handleStart = () => {
    requestPermission();
    start();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-black/40 uppercase tracking-wide">
        {MODE_LABELS[mode] ?? 'Ready'}
      </span>
      <span className="text-base font-mono font-semibold text-brand-text tabular-nums">
        {pad(minutes)}:{pad(seconds)}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={isRunning ? pause : handleStart}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-brand-light/40 text-brand-text/70 hover:text-brand-text transition-all"
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-brand-light/40 text-brand-text/40 hover:text-brand-text/70 transition-all"
          aria-label="Reset"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}
