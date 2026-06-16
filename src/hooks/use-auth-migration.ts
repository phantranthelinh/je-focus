'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc-client';
import { useTrackingStore } from '@/stores/tracking-store';

export function useAuthMigration() {
  const { userId } = useAuth();
  const prevUserId = useRef<string | null | undefined>(null);
  const migrateMutation = trpc.timer.migrateSessions.useMutation();

  useEffect(() => {
    const wasSignedOut = !prevUserId.current;
    const isNowSignedIn = !!userId;

    if (wasSignedOut && isNowSignedIn) {
      const migrationKey = `migration_done_${userId}`;
      if (localStorage.getItem(migrationKey)) {
        prevUserId.current = userId;
        return;
      }

      const dailyLog = useTrackingStore.getState().dailyLog;
      const sessions = Object.entries(dailyLog)
        .filter(([, record]) => record.totalSec > 0)
        .map(([date, record]) => ({
          date,
          totalFocusSec: record.totalSec,
        }));

      if (sessions.length > 0) {
        migrateMutation.mutate(
          { sessions },
          {
            onSuccess: () => {
              useTrackingStore.getState().clearAll();
              localStorage.setItem(migrationKey, '1');
            },
          }
        );
      } else {
        localStorage.setItem(migrationKey, '1');
      }
    }

    prevUserId.current = userId;
  }, [userId, migrateMutation]);
}
