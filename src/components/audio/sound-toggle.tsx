'use client';

import { cn } from '@/lib/utils';
import {
  CloudRain,
  Waves,
  Flame,
  Bird,
  Wind,
  CloudLightning,
  Droplets,
  Music,
  type LucideIcon,
} from 'lucide-react';

const SOUND_ICONS: Record<string, LucideIcon> = {
  rain: CloudRain,
  ocean: Waves,
  fire: Flame,
  birds: Bird,
  wind: Wind,
  thunder: CloudLightning,
  water: Droplets,
};

type SoundToggleProps = {
  id: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
};

export function SoundToggle({ id, label, enabled, onToggle }: SoundToggleProps) {
  const Icon = SOUND_ICONS[id] ?? Music;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200',
        enabled
          ? 'glass-strong text-brand-text shadow-md'
          : 'text-brand-text/40 hover:text-brand-text/70 hover:bg-brand-light/20'
      )}
      title={`${enabled ? 'Disable' : 'Enable'} ${label}`}
      aria-pressed={enabled}
    >
      <Icon size={22} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
