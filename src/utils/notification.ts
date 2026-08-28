import { Medication, ScheduleItem } from '../types.ts';
import { soundManager } from './audio.ts';
import { formatTime24to12 } from './helpers.ts';

export interface DueReminder {
  medication: Medication;
  schedule: ScheduleItem;
  dueTime: string; // e.g. "07:00"
  mealRelationText: string;
  triggerTimestamp: number;
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied');
  }
  return Notification.requestPermission();
}

export function sendBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch {
      // Ignore notification creation errors
    }
  }
}

/**
 * Check if a schedule is due at this minute
 * @param schedule Schedule item
 * @param currentHHMM Current time in "HH:MM" format (24h)
 */
export function isScheduleDue(schedule: ScheduleItem, currentHHMM: string): boolean {
  if (!schedule.reminderEnabled) return false;

  const [schedHour, schedMin] = schedule.time.split(':').map(Number);
  const [currHour, currMin] = currentHHMM.split(':').map(Number);

  // Scheduled time in total minutes from midnight
  const schedTotal = schedHour * 60 + schedMin;
  const targetTotal = schedTotal - (schedule.reminderMinutesBefore || 0);

  const currTotal = currHour * 60 + currMin;

  return currTotal === targetTotal;
}

export function playReminderNotice(medName: string, time: string, mealContext: string, soundEnabled = true) {
  if (soundEnabled) {
    soundManager.playReminderAlert();
  }
  sendBrowserNotification(
    `Medication Reminder: ${medName}`,
    `Scheduled for ${formatTime24to12(time)} (${mealContext}). Tap to view and mark as taken.`
  );
}
