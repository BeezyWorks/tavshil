import { clockShort, holyMeals, mainDish, mealTitle, startTime } from '@/features/plan/model'
import { lowerTime, mergeDays } from '@/features/prep/model'
import type { ISODate, MealCard, PlanView, PrepDay } from '@/lib/api/types'
import { clock12 } from '@/lib/dates'
import { PREP } from '@/lib/strings'

/** Deep link into cooking mode (`scheme: tavshil`). */
const cookUrl = (versionId: string | undefined | null) =>
  versionId ? `tavshil://cook/${versionId}` : null

/**
 * Everything the home-screen widget draws: the meal you cook next with a Cook button (the card above the week), and
 * today's prep list (the side panel on the plan). Plain JSON: it is handed to the widget runtime as props.
 */
export interface WidgetSnapshot {
  /** Epoch ms the snapshot was built. */
  updatedAt: number
  /** The next meal you are hosting with dishes. */
  next: {
    /** `Tonight’s dinner · 7:00` */
    kicker: string
    /** The main dish, else the meal's name. */
    title: string
    /** `Start at 4:30 · 6 people` */
    sub: string
    /** Cooking mode for the main dish; null when it has no recipe. */
    cookUrl: string | null
  } | null
  /** Today's prep, time order. `left` counts the ones not ticked off. */
  prep: {
    tasks: { time: string; text: string; sub: string; done: boolean; cookUrl: string | null }[]
    left: number
  }
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  updatedAt: 0,
  next: null,
  prep: { tasks: [], left: 0 },
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

export function buildSnapshot(input: {
  today: ISODate
  /** Minutes past midnight now in the household's zone. */
  nowMin: number | null
  now: number
  view: PlanView | undefined
  prep: PrepDay[] | undefined
}): WidgetSnapshot {
  const { today, nowMin, view, prep } = input

  const meal = view ? nextMeal(view, nowMin) : null
  let next: WidgetSnapshot['next'] = null
  if (meal) {
    const main = mainDish(meal)
    const start = meal.id ? startTime(prep ?? [], meal.id, meal.date) : null
    const total = meal.headcount?.total
    const people = total ? (meal.hosted ? `${total} people` : `${total} of us`) : ''
    next = {
      kicker: [mealTitle(meal, today), meal.timeText ? clockShort(clock12(meal.timeText)) : '']
        .filter(Boolean)
        .join(' · '),
      title: main?.title || meal.name,
      sub: [start ? `Start at ${clockShort(start)}` : '', people].filter(Boolean).join(' · '),
      cookUrl: cookUrl(main?.versionId),
    }
  }

  const todays = mergeDays(prep ?? []).find((d) => d.date === today)?.tasks ?? []
  const tasks = todays.map((t) => {
    const sitting = t.waitUntil ?? (t.passive ? t.endTime : undefined)
    return {
      time: lowerTime(t.time),
      text: t.text,
      sub: [
        t.passive || t.waitUntil
          ? sitting
            ? PREP.sitsUntil(lowerTime(sitting))
            : PREP.passive
          : '',
        t.mealName,
      ]
        .filter(Boolean)
        .join(' · '),
      done: t.done,
      cookUrl: t.kind === 'active' ? cookUrl(t.versionId) : null,
    }
  })

  return {
    updatedAt: input.now,
    next,
    // Not-done first so the widget's few rows show what is left; done ones trail for context.
    prep: {
      tasks: [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)].slice(0, 10),
      left: tasks.filter((t) => !t.done).length,
    },
  }
}
