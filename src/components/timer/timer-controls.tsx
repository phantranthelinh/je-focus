import { Play, Pause, RotateCcw } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

type TimerControlsProps = {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

export function TimerControls({
  isRunning,
  onStart,
  onPause,
  onReset,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6 my-6">
      <AnimatePresence mode="wait">
        {isRunning ? (
          <m.button 
            key="pause"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={onPause}
            className="flex items-center justify-center px-10 py-5 rounded-[2rem] bg-black/90 text-white shadow-lg backdrop-blur-sm"
          >
            <Pause size={20} className="flex-shrink-0 mr-3 fill-white" />
            <span className="font-bold text-lg tracking-wider">PAUSE</span>
          </m.button>
        ) : (
          <m.button 
            key="start"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={onStart}
            className="flex items-center justify-center px-12 py-5 rounded-[2rem] bg-black/90 text-white shadow-lg backdrop-blur-sm border border-black/10"
          >
            <Play size={22} className="flex-shrink-0 mr-3 fill-white ml-2" />
            <span className="font-bold text-xl tracking-wider pr-2">START</span>
          </m.button>
        )}
      </AnimatePresence>

      <m.button 
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1, rotate: -45 }}
        onClick={onReset} 
        aria-label="Reset timer"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-black/5 text-black/80 backdrop-blur-sm"
      >
        <RotateCcw size={20} strokeWidth={2.5} />
      </m.button>
    </div>
  );
}
