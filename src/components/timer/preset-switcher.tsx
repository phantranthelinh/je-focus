'use client';

import { useTimerStore } from '@/stores/timer-store';
import { TIMER_PRESETS, PresetKey } from '@/lib/presets';
import { clsx } from 'clsx';

const PRESET_KEYS: PresetKey[] = ['pomodoro', 'deepwork', 'quick'];

export function PresetSwitcher() {
  const preset = useTimerStore((s) => s.preset);
  const isRunning = useTimerStore((s) => s.isRunning);
  const setPreset = useTimerStore((s) => s.setPreset);

  return (
    <div className="flex items-center gap-2">
      {PRESET_KEYS.map((key) => {
        const isActive = preset === key;
        return (
          <button
            key={key}
            onClick={() => setPreset(key)}
            disabled={isRunning}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              isActive
                ? 'text-brand-coral font-semibold underline underline-offset-4 decoration-brand-coral'
                : 'text-brand-muted hover:text-brand-text transition-colors',
              isRunning && 'opacity-50 cursor-not-allowed'
            )}
          >
            {TIMER_PRESETS[key].label}
          </button>
        );
      })}
    </div>
  );
}
