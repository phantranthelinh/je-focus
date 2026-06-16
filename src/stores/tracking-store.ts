import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DayRecord = {
  sessions: number;
  totalSec: number;
};

/** Map of ISO date string (e.g. "2026-04-15") → day data */
export type DailyLog = Record<string, DayRecord>;

type TrackingState = {
  dailyLog: DailyLog;
};

type TrackingActions = {
  /** Call this when a focus session completes (guest mode) */
  recordSession: (totalSec: number) => void;
  /** Returns the last N days as an array sorted oldest→newest */
  getRecentDays: (n: number) => Array<{ date: string } & DayRecord>;
  /** Clears all tracked session data (used on migration to server) */
  clearAll: () => void;
};

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useTrackingStore = create<TrackingState & TrackingActions>()(
  persist(
    (set, get) => ({
      dailyLog: {},

      recordSession: (totalSec) => {
        const key = todayKey();
        const log = get().dailyLog;
        const existing = log[key] ?? { sessions: 0, totalSec: 0 };
        set({
          dailyLog: {
            ...log,
            [key]: {
              sessions: existing.sessions + 1,
              totalSec: existing.totalSec + totalSec,
            },
          },
        });
      },

      getRecentDays: (n) => {
        const log = get().dailyLog;
        const days: Array<{ date: string } & DayRecord> = [];
        const now = new Date();

        for (let i = n - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          const record = log[key] ?? { sessions: 0, totalSec: 0 };
          days.push({ date: key, ...record });
        }

        return days;
      },

      clearAll: () => set({ dailyLog: {} }),
    }),
    {
      name: 'jefocus-tracking',
    }
  )
);
