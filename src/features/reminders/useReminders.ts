import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'

import { canNotify } from '@/features/cook/notifications'
import { useCalendar, useHouseholdInfo, usePrep, useToday } from '@/lib/api/hooks'
import { addDays } from '@/lib/dates'

import { HORIZON_DAYS, planReminders, restWindowsFromCalendar } from './plan'
import { replacePrepReminders } from './scheduler'
import { useReminderSettings } from './settings'

/**
 * Keeps the phone's pending prep reminders in step with the prep schedule: whenever the schedule,
 * the calendar or the settings change (and when the app comes back to the front), the old set is
 * cancelled and the new one scheduled. Mount once, signed in.
 */
function useNativePrepReminders() {
  const qc = useQueryClient()
  const [settings] = useReminderSettings()
  const { data: info } = useHouseholdInfo()
  const today = useToday()
  const prep = usePrep().data
  // One day past the horizon, so a rest day that straddles its end still has its havdalah.
  const calendar = useCalendar(
    today ?? '',
    today ? addDays(today, HORIZON_DAYS + 2) : '',
    today !== undefined,
  ).data
  const timeZone = info?.location.timeZone

  // Coming back to the app refreshes the plan, which in turn reschedules.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      void qc.invalidateQueries({ queryKey: ['prep'] })
      void qc.invalidateQueries({ queryKey: ['calendar'] })
    })
    return () => sub.remove()
  }, [qc])

  const reminders = useMemo(
    () =>
      prep && calendar && timeZone
        ? planReminders({
            days: prep,
            rests: restWindowsFromCalendar(calendar),
            settings,
            timeZone,
            now: Date.now(),
          })
        : null,
    [prep, calendar, timeZone, settings],
  )

  // Only touch the phone when the set actually differs from what was last scheduled.
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!reminders) return
    const signature = JSON.stringify(reminders)
    if (signature === last.current) return
    last.current = signature
    void replacePrepReminders(reminders)
  }, [reminders])
}

/** `canNotify` never changes at runtime, so choosing the hook here keeps hook order stable. */
export const usePrepReminders: () => void = canNotify ? useNativePrepReminders : () => undefined
