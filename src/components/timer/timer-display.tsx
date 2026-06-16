'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTimerStore } from '@/stores/timer-store';

type TimerMode = 'focus' | 'break' | 'longBreak' | 'idle';

type TimerDisplayProps = {
  remainingSeconds: number;
  mode: TimerMode;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const SLIDER_STEPS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export function TimerDisplay({
  remainingSeconds,
  mode,
}: TimerDisplayProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const customConfig = useTimerStore((s) => s.customConfig);
  const setCustomConfig = useTimerStore((s) => s.setCustomConfig);
  const isRunning = useTimerStore((s) => s.isRunning);

  // Input state — kept local so user can type freely before committing
  const [inputVal, setInputVal] = useState(String(customConfig.focusMin));

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function clampMinutes(v: number) {
    return Math.min(120, Math.max(15, isNaN(v) ? 15 : v));
  }

  function applyMinutes(mins: number) {
    const clamped = clampMinutes(mins);
    setInputVal(String(clamped));
    setCustomConfig({ ...customConfig, focusMin: clamped });
  }

  // Slider value → nearest step index
  const currentStep = SLIDER_STEPS.indexOf(customConfig.focusMin);
  const sliderValue = currentStep !== -1 ? currentStep : (() => {
    // If value is outside steps (direct input), find nearest
    let nearest = 0;
    let minDiff = Infinity;
    SLIDER_STEPS.forEach((v, i) => {
      const diff = Math.abs(v - customConfig.focusMin);
      if (diff < minDiff) { minDiff = diff; nearest = i; }
    });
    return nearest;
  })();

  return (
    <div ref={panelRef} className="relative flex flex-col items-center py-3 bg-brand-hairline/40 rounded-3xl mx-auto w-full max-w-sm">
      {/* Timer row: time + settings icon */}
      <div className="relative flex items-center justify-center gap-3 z-10">
        <span className="text-5xl font-sans font-black tracking-tight text-brand-text leading-none transition-all duration-300">
          {formatTime(remainingSeconds)}
        </span>

        {/* Settings icon — only show when idle */}
        {mode === 'idle' && (
          <button
            onClick={() => {
              if (!open) setInputVal(String(customConfig.focusMin));
              setOpen((v) => !v);
            }}
            aria-label="Chỉnh thời gian"
            className={cn(
              'p-1.5 rounded-full transition-all duration-200',
              open
                ? 'bg-brand-coral text-white rotate-45'
                : 'text-brand-muted/60 hover:text-brand-muted hover:bg-brand-hairline'
            )}
          >
            <Settings size={18} strokeWidth={2.2} className="transition-transform duration-200" />
          </button>
        )}
      </div>

      {/* Inline settings panel */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mt-4 w-full px-5"
          >
            <div className="bg-[#faf9f5] border border-brand-hairline rounded-2xl px-5 py-4 shadow-sm space-y-4">
              {/* Slider step display */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Thời gian focus</span>
                {/* Direct number input */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={15}
                    max={120}
                    disabled={isRunning}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(inputVal, 10);
                      applyMinutes(parsed);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const parsed = parseInt(inputVal, 10);
                        applyMinutes(parsed);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={cn(
                      'w-12 text-right text-base font-black text-black/90 bg-transparent outline-none',
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    )}
                  />
                  <span className="text-sm font-semibold text-brand-muted">phút</span>
                </div>
              </div>

              {/* Slider */}
              <div className="relative w-full select-none">
                {/* Track */}
                <div className="relative h-2 rounded-full bg-brand-hairline overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-brand-coral transition-all duration-150"
                    style={{ width: `${(sliderValue / (SLIDER_STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Native range input laid on top */}
                <input
                  type="range"
                  min={0}
                  max={SLIDER_STEPS.length - 1}
                  step={1}
                  value={sliderValue}
                  disabled={isRunning}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    applyMinutes(SLIDER_STEPS[idx]);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                />

                {/* Step dots */}
                <div className="flex justify-between mt-2 px-0">
                  {SLIDER_STEPS.map((v, i) => (
                    <button
                      key={v}
                      disabled={isRunning}
                      onClick={() => applyMinutes(v)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 group',
                        isRunning && 'cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'w-1 h-1 rounded-full transition-colors',
                        i <= sliderValue ? 'bg-brand-coral' : 'bg-brand-hairline',
                        !isRunning && 'group-hover:bg-brand-coral/60'
                      )} />
                      {(i === 0 || i === SLIDER_STEPS.length - 1 || v === 25 || v === 45) && (
                        <span className={cn(
                          'text-[9px] font-semibold transition-colors',
                          i <= sliderValue ? 'text-brand-muted' : 'text-brand-muted/40'
                        )}>
                          {v}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

    </div>
  );
}
