'use client';

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUiStore } from '@/stores/ui-store';

type NotificationAction = { label: string; action: string };

function playAlertSound() {
  if (typeof window === 'undefined') return;
  const audio = new Audio('/sounds/alert.mp3');
  audio.volume = 0.7;
  audio.play().catch(() => {
    // Autoplay may be blocked — silently ignore
  });
}

export function useNotification() {
  const { notificationPermission, setNotificationPermission } = useUiStore(
    useShallow((s) => ({
      notificationPermission: s.notificationPermission,
      setNotificationPermission: s.setNotificationPermission,
    }))
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    } else {
      setNotificationPermission(Notification.permission);
    }
  }, [setNotificationPermission]);

  const notify = useCallback(
    (title: string, body: string, actions?: NotificationAction[]) => {
      playAlertSound();

      if (typeof window === 'undefined' || !('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            actions,
          });
        } else {
          new Notification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
          });
        }
      }
    },
    []
  );

  const notifyTimerComplete = useCallback(
    (mode: string) => {
      const messages: Record<string, { title: string; body: string }> = {
        focus: { title: 'Focus Complete!', body: 'Great work! Time for a break.' },
        break: { title: 'Break Over!', body: 'Ready to focus again?' },
        longBreak: { title: 'Long Break Over!', body: 'Session complete! Start a new one?' },
      };

      const msg = messages[mode] ?? { title: 'Timer Complete', body: 'Your timer has finished.' };

      notify(msg.title, msg.body, [
        { label: mode === 'focus' ? 'Start Break' : 'Start Focus', action: 'continue' },
        { label: 'Dismiss', action: 'dismiss' },
      ]);
    },
    [notify]
  );

  return {
    notificationPermission,
    requestPermission,
    notify,
    notifyTimerComplete,
  };
}
