import { useEffect, useState } from 'react'

import { useHouseholdInfo, usePrep, useShopping } from '@/lib/api/hooks'
import type { ISODate, PrepDay, PrepTask, ShoppingLine } from '@/lib/api/types'
import { clockMinutes, minutesNowIn, weekdayName } from '@/lib/dates'

/** A tick done flag, once prep tasks carry one. */
const isDone = (t: PrepTask) => (t as PrepTask & { done?: boolean }).done === true

/** Lines still to buy. */
export function shoppingLeft(lines: ShoppingLine[] | undefined): number {
  return (lines ?? []).filter((l) => !l.checked).length
}

/** Prep tasks from today on that are not ticked off. Everything when today is not known yet. */
export function prepLeft(days: PrepDay[] | undefined, today: ISODate | undefined): number {
  return (days ?? [])
    .filter((d) => !today || d.date >= today)
    .reduce((n, d) => n + d.tasks.filter((t) => !isDone(t)).length, 0)
}

export interface NextPrep {
  /** "5:50 PM" today, "Thu 8:00 AM" on a later day. */
  when: string
  text: string
  mealName: string
}

/**
 * The next prep task still ahead: later today (by the household's clock) or on a later day.
 * A task today without a time is skipped, since it cannot be placed against now.
 */
export function nextPrep(
  days: PrepDay[] | undefined,
  today: ISODate | undefined,
  nowMinutes: number | null,
): NextPrep | null {
  if (!today) return null
  for (const d of [...(days ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (d.date < today) continue
    const tasks = d.tasks
      .filter((t) => !isDone(t))
      .map((t) => ({ t, at: clockMinutes(t.time) }))
      .filter(
        ({ at }) => d.date > today || (at !== null && (nowMinutes === null || at >= nowMinutes)),
      )
      .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
    const first = tasks[0]?.t
    if (first) {
      const day = d.date === today ? '' : `${weekdayName(d.date, true)} `
      return { when: `${day}${first.time}`.trim(), text: first.text, mealName: first.mealName }
    }
  }
  return null
}

/** Re-renders once a minute so "next" moves on as time passes. */
function useMinute(): number {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return t
}

/** Badge counts for the tabs and the next prep task, shared by the web nav and iOS tabs. */
export function useNavCounts() {
  const shopping = useShopping()
  const prep = usePrep()
  const info = useHouseholdInfo().data
  const now = useMinute()
  const today = info?.today
  const minutes = info ? minutesNowIn(info.location.timeZone, new Date(now)) : null
  return {
    shopping: shopping.data ? shoppingLeft(shopping.data) : 0,
    prep: prep.data ? prepLeft(prep.data, today) : 0,
    next: prep.data ? nextPrep(prep.data, today, minutes) : null,
  }
}

/** A badge's text: nothing at zero, "99+" past 99. */
export const badgeText = (n: number): string | undefined =>
  n <= 0 ? undefined : n > 99 ? '99+' : String(n)
