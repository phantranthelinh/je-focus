'use client';

import { cn } from '@/lib/utils';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

type VolumeSliderProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  /** Hide the leading speaker icon (e.g. when a separate mute button already shows one). */
  hideIcon?: boolean;
};

export function VolumeSlider({ value, onChange, disabled, label, hideIcon }: VolumeSliderProps) {
  return (
    <div className={cn('flex items-center gap-2 w-full', disabled && 'opacity-40')}>
      {!hideIcon &&
        (value === 0 ? (
          <VolumeX size={16} className="text-brand-text/40 shrink-0" />
        ) : (
          <Volume2 size={16} className="text-brand-text/60 shrink-0" />
        ))}

      {label && (
        <span className="text-xs text-brand-text/60 w-14 shrink-0 truncate">{label}</span>
      )}

      <Slider
        value={[Math.round(value * 100)]}
        min={0}
        max={100}
        disabled={disabled}
        onValueChange={(val) => {
          const v = Array.isArray(val) ? (val as number[])[0] : (val as number);
          onChange(v / 100);
        }}
        className="flex-1"
        aria-label={label ? `${label} volume` : 'Volume'}
      />

      <span className="text-xs text-brand-text/40 w-7 text-right shrink-0">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}
