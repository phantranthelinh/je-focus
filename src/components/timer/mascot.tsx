'use client';

import Image from 'next/image';

type MascotProps = {
  currentRound: number;
  maxRounds: number;
  isRunning: boolean;
  mode: 'focus' | 'break' | 'longBreak' | 'idle';
};

export function Mascot({ currentRound, maxRounds, isRunning, mode }: MascotProps) {
  const progress = currentRound / Math.max(1, maxRounds);
  const isEvolved = progress > 0.5;
  const mascotImage = isEvolved ? '/je/je-2.png' : '/je/je.png';

  let floatClass = 'mascot-float-idle';
  if (isRunning) {
    floatClass = mode === 'focus' ? 'mascot-float-focusing' : 'mascot-float-resting';
  }

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      {/* key remounts on image swap so the enter animation replays (crossfade-in) */}
      <div key={mascotImage} className="mascot-enter absolute inset-0">
        <div className={`${floatClass} w-full h-full relative`}>
          <Image
            src={mascotImage}
            alt={isEvolved ? 'Evolved Je mascot' : 'Je mascot'}
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
