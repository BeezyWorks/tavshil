import { holyMeals, mealTitle, toBuy } from '@/features/plan/model'
import type { ISODate, MealCard, PlanView, PrepDay, ShoppingLine } from '@/lib/api/types'
import { clockMinutes, weekdayName } from '@/lib/dates'

/** Everything the home-screen widget draws. Plain JSON: it is handed to the widget runtime as props. */
export interface WidgetSnapshot {
  /** Epoch ms the snapshot was built. */
  updatedAt: number
  /** The next meal you are hosting, e.g. `Tonight’s dinner`, with when and what. */
  next: { title: string; when: string; dishes: string[]; more: number } | null
  shopping: { count: number; items: string[] }
  /** Today's prep, time order. `left` counts the ones not ticked off. */
  prep: { tasks: { time: string; text: string; done: boolean }[]; left: number }
  /** Seven days of the current week. */
  week: { label: string; today: boolean; note: string; meals: string[] }[]
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  updatedAt: 0,
  next: null,
  shopping: { count: 0, items: [] },
  prep: { tasks: [], left: 0 },
  week: [],
}

/** `4:30 PM`-style text for a meal's 24-hour `HH:MM`. */
function timeText(hhmm: string | null): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

/** Every meal of the week, in order, that we host and have something planned for. */
function weekMeals(view: PlanView): MealCard[] {
  const out: MealCard[] = []
  for (const day of view.days) {
    const all = [...day.meals, ...holyMeals(day, view.runs)]
    if (day.eve?.meal) all.push(day.eve.meal)
    out.push(...all)
  }
  return out
}

/** The first meal from now on that we cook (not one we are guests at) and that has dishes. */
export function nextMeal(view: PlanView, nowMin: number | null): MealCard | null {
  const sorted = weekMeals(view)
    .filter((m) => !m.virtual && m.id && !m.guestOf && m.dishes.length > 0)
    .sort((a, b) =>
      a.date === b.date ? (a.time ?? 24 * 60) - (b.time ?? 24 * 60) : a.date < b.date ? -1 : 1,
    )
  return (
    sorted.find((m) => {
      if (m.date !== view.today) return m.date > view.today
      return m.time === null || nowMin === null || m.time >= nowMin
    }) ?? null
  )
}

const unique = (xs: string[]) => [...new Set(xs)]

export function buildSnapshot(input: {
  today: ISODate
  /** Minutes past midnight now in the household's zone. */
  nowMin: number | null
  now: number
  view: PlanView | undefined
  prep: PrepDay[] | undefined
  shopping: ShoppingLine[] | undefined
}): WidgetSnapshot {
  const { today, nowMin, view, prep, shopping } = input

  const meal = view ? nextMeal(view, nowMin) : null
  const next: WidgetSnapshot['next'] = meal
    ? {
        title: mealTitle(meal, today),
        when: [meal.date === today ? '' : weekdayName(meal.date, true), timeText(meal.timeText)]
          .filter(Boolean)
          .join(' '),
        dishes: meal.dishes.slice(0, 6).map((d) => d.title),
        more: Math.max(0, meal.dishes.length - 6),
      }
    : null

  const buy = toBuy(shopping)
  const todays = (prep?.filter((d) => d.date === today).flatMap((d) => d.tasks) ?? []).sort(
    (a, b) => (clockMinutes(a.time) ?? 0) - (clockMinutes(b.time) ?? 0),
  )

  const week = (view?.days ?? []).map((d) => {
    const cooked = [...d.meals, ...holyMeals(d, view?.runs ?? [])]
    if (d.eve?.meal) cooked.push(d.eve.meal)
    return {
      label: `${weekdayName(d.date, true)} ${Number(d.date.slice(8))}`,
      today: d.date === today,
      note: d.holidays.map((h) => h.name)[0] ?? (d.isShabbat ? (view?.parasha ?? 'Shabbat') : ''),
      meals: unique(cooked.filter((m) => m.planned && !m.virtual).map((m) => m.name)),
    }
  })

  return {
    updatedAt: input.now,
    next,
    shopping: { count: buy.length, items: buy.slice(0, 8).map((l) => l.name) },
    prep: {
      tasks: todays.slice(0, 8).map((t) => ({ time: t.time, text: t.text, done: t.done })),
      left: todays.filter((t) => !t.done).length,
    },
    week,
  }
}
