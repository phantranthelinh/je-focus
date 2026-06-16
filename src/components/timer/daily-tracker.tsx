'use client';

import { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronUp, Flame, Timer, Zap } from 'lucide-react';
import { useTrackingStore } from '@/stores/tracking-store';
import { useAuthSafe as useAuth } from '@/lib/clerk-hooks';
import { trpc } from '@/lib/trpc-client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMinutes(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return SHORT_DAYS[d.getDay()];
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

type DayBar = { date: string; sessions: number; totalSec: number };

function BarChart({ days }: { days: DayBar[] }) {
  const today = todayKey();
  const maxSec = Math.max(...days.map((d) => d.totalSec), 1);

  return (
    <div className="flex items-end justify-between gap-1.5 w-full h-24 px-1">
      {days.map((day, i) => {
        const isToday = day.date === today;
        const pct = Math.max((day.totalSec / maxSec) * 100, day.totalSec > 0 ? 8 : 4);
        const label = getDayLabel(day.date);

        return (
          <div key={day.date} className="flex flex-col items-center justify-end flex-1 gap-1 h-full">
            <div className="relative flex flex-col items-center justify-end w-full flex-1">
              <m.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                style={{ height: `${pct}%`, originY: 1 }}
                className={`w-full rounded-full transition-colors ${
                  isToday
                    ? 'bg-brand-coral'
                    : day.totalSec > 0
                    ? 'bg-brand-coral/30'
                    : 'bg-brand-hairline'
                }`}
              />
            </div>
            <span
              className={`text-[10px] font-medium leading-none ${
                isToday ? 'text-brand-coral font-bold' : 'text-brand-muted/50'
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 bg-brand-light rounded-2xl py-3 px-2">
      <div className="flex items-center gap-1 text-brand-coral mb-0.5">{icon}</div>
      <span className="text-base font-black text-brand-text leading-none">{value}</span>
      <span className="text-[10px] text-brand-muted/60 font-medium leading-none mt-0.5">{label}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DailyTracker() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();

  // Guest local data
  const getRecentDays = useTrackingStore((s) => s.getRecentDays);
  const localDays = useMemo(() => getRecentDays(7), [getRecentDays]);
  const todayLocal = localDays[localDays.length - 1];

  // Auth server data
  const chartQuery = trpc.timer.dailyChart.useQuery(
    { days: 7 },
    { enabled: !!isSignedIn }
  );
  const statsQuery = trpc.timer.stats.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  // Decide which data to show
  const chartDays: DayBar[] = isSignedIn
    ? (chartQuery.data ?? localDays)
    : localDays;

  const todaySessions = isSignedIn
    ? (statsQuery.data?.today.sessions ?? 0)
    : (todayLocal?.sessions ?? 0);

  const todayTotalSec = isSignedIn
    ? (statsQuery.data?.today.totalSec ?? 0)
    : (todayLocal?.totalSec ?? 0);

  const streak = isSignedIn ? (statsQuery.data?.streak ?? 0) : (() => {
    // Calculate streak from local data
    const log = useTrackingStore.getState().dailyLog;
    let s = 0;
    const now = new Date();
    const check = new Date(now);
    while (true) {
      const y = check.getFullYear();
      const m = String(check.getMonth() + 1).padStart(2, '0');
      const d = String(check.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      if (!log[key] || log[key].sessions === 0) break;
      s++;
      check.setDate(check.getDate() - 1);
    }
    return s;
  })();

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <m.div
        className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center"
        style={{ pointerEvents: 'none' }}
      >
        {/* Sheet panel */}
        <AnimatePresence>
          {open && (
            <m.div
              key="sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="w-full max-w-sm mx-auto bg-[#ffffff] border-t border-x border-brand-hairline rounded-t-3xl shadow-2xl px-5 pt-3 pb-8"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-brand-hairline rounded-full mx-auto mb-5" />

              {/* Title */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-brand-muted tracking-wide uppercase">
                  This Week
                </h2>
                <span className="text-xs text-brand-muted/50 font-medium">
                  {formatMinutes(chartDays.reduce((a, d) => a + d.totalSec, 0))} total
                </span>
              </div>

              {/* Bar Chart */}
              <BarChart days={chartDays} />

              {/* Divider */}
              <div className="h-px bg-brand-hairline my-4" />

              {/* Stats row */}
              <div className="flex gap-2">
                <StatChip
                  icon={<Zap size={12} />}
                  label="Sessions"
                  value={String(todaySessions)}
                />
                <StatChip
                  icon={<Timer size={12} />}
                  label="Focus"
                  value={formatMinutes(todayTotalSec)}
                />
                <StatChip
                  icon={<Flame size={12} />}
                  label="Streak"
                  value={`${streak}d`}
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Toggle pill — always visible */}
        <m.button
          onClick={() => setOpen((v) => !v)}
          style={{ pointerEvents: 'auto' }}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          className={`
            flex items-center gap-2 px-5 py-2.5 mb-3
            rounded-full shadow-lg backdrop-blur-sm
            font-semibold text-sm tracking-wide
            transition-colors duration-200 select-none
            ${open
              ? 'bg-brand-coral text-white'
              : 'bg-[#ffffff] text-brand-muted border border-brand-hairline'
            }
          `}
        >
          <m.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp size={16} strokeWidth={2.5} />
          </m.div>
          <span>Today — {todaySessions} session{todaySessions !== 1 ? 's' : ''}</span>
        </m.button>
      </m.div>
    </>
  );
}
