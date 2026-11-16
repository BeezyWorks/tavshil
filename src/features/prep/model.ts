import type { ISODate, PrepDay, PrepTask } from '@/lib/api/types'
import { clockMinutes, dayNum, weekdayEnglish } from '@/lib/dates'

/** One meal that has prep, with how far along it is. */
export interface PrepMeal {
  mealId: string
  name: string
  date?: ISODate
  /** When it is served, e.g. `7:00 pm`. */
  time?: string
  tasks: PrepTask[]
  done: number
  /** The first task still to do, in time order. */
  next?: { task: PrepTask; date: ISODate }
}

/** "5:50 PM" to "5:50 pm". */
export const lowerTime = (t: string): string =>
  t.replace(/\s*(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`)

/** "Thu 19" */
export const dayShort = (date: ISODate): string => `${weekdayEnglish(date, true)} ${dayNum(date)}`

const sortKey = (date: string | undefined, time: string | undefined) =>
  `${date ?? ''} ${String(clockMinutes(time) ?? 0).padStart(4, '0')}`

/** Every meal on the schedule, by date then serve time. Tasks with no meal (the eruv tavshilin) belong to none. */
export function prepMeals(days: PrepDay[]): PrepMeal[] {
  const byId = new Map<string, PrepMeal>()
  const get = (mealId: string, name: string, date?: ISODate, time?: string) => {
    let m = byId.get(mealId)
    if (!m) byId.set(mealId, (m = { mealId, name, tasks: [], done: 0 }))
    if (name && !m.name) m.name = name
    if (date && !m.date) m.date = date
    if (time && !m.time) m.time = time
    return m
  }
  for (const d of days) {
    for (const m of d.meals) get(m.mealId, m.name, d.date, m.time)
    for (const t of d.tasks) {
      if (!t.mealId) continue
      const m = get(t.mealId, t.mealName, t.mealDate, t.mealTime)
      // The meal's own date wins over the day a task happens to be on.
      if (t.mealDate) m.date = t.mealDate
      m.tasks.push(t)
      if (t.done) m.done++
      if (!t.done && (!m.next || sortKey(d.date, t.time) < sortKey(m.next.date, m.next.task.time)))
        m.next = { task: t, date: d.date }
    }
  }
  return [...byId.values()]
    .filter((m) => m.tasks.length > 0)
    .sort((a, b) => (sortKey(a.date, a.time) < sortKey(b.date, b.time) ? -1 : 1))
}

/** Drop selections whose meal is gone from the schedule. */
export const validSelection = (selected: string[], meals: PrepMeal[]): string[] =>
  selected.filter((id) => meals.some((m) => m.mealId === id))

/**
 * The days to draw. No selection keeps everything (and the Shabbat block even on a day with no task);
 * a selection keeps only the picked meals' tasks and the days they are on.
 */
export function filterPrep(days: PrepDay[], selected: string[]): PrepDay[] {
  const pick = new Set(selected)
  return mergeDays(days)
    .map((d) =>
      pick.size ? { ...d, tasks: d.tasks.filter((t) => t.mealId && pick.has(t.mealId)) } : d,
    )
    .filter((d) => d.tasks.length > 0 || (!pick.size && !!d.rest))
}

/** "1 of 2 done · next Thu 8:00 am". */
export function progressText(m: PrepMeal, today?: ISODate): string {
  const done = `${m.done} of ${m.tasks.length} done`
  if (!m.next) return done
  const day = m.next.date === today ? '' : `${weekdayEnglish(m.next.date, true)} `
  return `${done} · next ${day}${lowerTime(m.next.task.time)}`
}

/** What is not yet ticked across the days shown. */
export const tasksLeft = (days: PrepDay[]): number =>
  days.reduce((n, d) => n + d.tasks.filter((t) => !t.done).length, 0)

/** Shabbat or Yom Tov block wording. */
export function restBlock(rest: NonNullable<PrepDay['rest']>) {
  return {
    cutoff: `Hands-on cooking ends ${lowerTime(rest.handsOnEnds).replace(/ (am|pm)$/, '')} · Candle lighting ${lowerTime(rest.candleLighting)}`,
    title: `${rest.label} · until ${lowerTime(rest.until)} ${weekdayEnglish(rest.untilDate, true)}`,
    body: 'Nothing scheduled and no reminders.',
  }
}

/** The schedule splits a day at night ("Thursday night"); the timeline wants one heading per date. */
export function mergeDays(days: PrepDay[]): PrepDay[] {
  const byDate = new Map<string, PrepDay>()
  for (const d of days) {
    const cur = byDate.get(d.date)
    if (!cur) {
      byDate.set(d.date, { ...d, tasks: [...d.tasks] })
      continue
    }
    cur.tasks.push(...d.tasks)
    cur.meals = [
      ...cur.meals,
      ...d.meals.filter((m) => !cur.meals.some((x) => x.mealId === m.mealId)),
    ]
    cur.rest ??= d.rest
    cur.hebrew ??= d.hebrew
    cur.candleLighting ??= d.candleLighting
  }
  return [...byDate.values()]
    .map((d) => ({
      ...d,
      tasks: [...d.tasks].sort((a, b) => (clockMinutes(a.time) ?? 0) - (clockMinutes(b.time) ?? 0)),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}
