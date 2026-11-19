import { useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'

import { useHouseholdInfo, usePrep, useShopping, useToday, useWeek } from '@/lib/api/hooks'
import { minutesNowIn } from '@/lib/dates'

import { buildSnapshot } from './model'
import { pushWidgetSnapshot } from './sync'

/**
 * Keeps the home-screen widget in step with the plan, prep schedule and shopping list: whenever
 * any of them changes (the app also refetches on return from the background), a fresh snapshot is
 * pushed. Mount once, signed in.
 */
function useNativeWidgetSync() {
  const today = useToday()
  const timeZone = useHouseholdInfo().data?.location.timeZone
  const view = useWeek().data
  const prep = usePrep().data
  const shopping = useShopping().data

  const snapshot = useMemo(() => {
    if (!today || !view) return null
    const now = Date.now()
    return buildSnapshot({
      today,
      now,
      nowMin: timeZone ? minutesNowIn(timeZone, new Date(now)) : null,
      view,
      prep,
      shopping,
    })
  }, [today, timeZone, view, prep, shopping])

  // Only touch the widget when what it shows actually differs from what was last pushed.
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!snapshot) return
    const { updatedAt: _t, ...shown } = snapshot
    const signature = JSON.stringify(shown)
    if (signature === last.current) return
    last.current = signature
    pushWidgetSnapshot(snapshot)
  }, [snapshot])
}

export const useWidgetSync: () => void =
  Platform.OS === 'ios' ? useNativeWidgetSync : () => undefined
