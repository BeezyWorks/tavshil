import * as Notifications from 'expo-notifications'

import { canNotify, ensurePermission, PREP_REMINDER_KIND } from '@/features/cook/notifications'

import { REMINDER_ID_PREFIX, type Reminder } from './plan'

/** Cancel every pending prep reminder, leaving cooking-timer notifications alone. */
async function cancelPrepReminders() {
  const pending = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

/**
 * Make the pending prep reminders exactly `reminders`. Asks for notification permission the first
 * time there is something to schedule; without it nothing is scheduled.
 */
export async function replacePrepReminders(reminders: Reminder[]) {
  if (!canNotify) return
  try {
    await cancelPrepReminders()
    if (!reminders.length || !(await ensurePermission())) return
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { kind: PREP_REMINDER_KIND, url: r.url } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.fireAt),
        },
      })
    }
  } catch {
    // Reminders are a convenience: a refused schedule must never get in the way of the app.
  }
}
