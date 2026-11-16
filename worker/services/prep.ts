// The prep schedule (BRIEF §9): every meal with dishes, worked back from its time by core's scheduler, with the
// household's done marks on each task.
import { todayIn } from '@beitecha/engine'
import {
  buildPrepSchedule,
  calendarDays,
  type HouseholdLocation,
  type PrepMeal,
  type PrepSchedule,
} from '@tavshil/core'
import { and, eq, inArray, isNull } from 'drizzle-orm'

import * as s from '../db/schema'
import { clock, inChunks, invalid, unique, type Actor, type Db } from './ctx'
import { householdLocation } from './households'
import { requireMeal, settlePassedMeals } from './planning'
import { mealsInRange, planMeals, type MealRow, type PlannedMeals } from './plans'

export function addDaysStr(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
}

function slotFor(
  meal: { name: string; date: string; time: number | null },
  day: ReturnType<typeof calendarDays>[number],
) {
  const n = meal.name.toLowerCase()
  if (/breakfast/.test(n)) return 'breakfast' as const
  if (/shlishit|third/.test(n)) return 'seudah_shlishit' as const
  if (/lunch|brunch|day/.test(n)) return 'lunch' as const
  if (/night|dinner|supper|seder/.test(n)) return 'dinner' as const
  if (day.noMelacha && !day.isErevShabbat) return 'lunch' as const
  return 'dinner' as const
}

/** One dish on the schedule: what it is and what was assumed about it. */
export interface PrepDish {
  /** The meal item. */
  itemId: string
  mealId: string
  title: string
  recipeId: string | null
  versionId: string | null
  brought: boolean
  /** The recipe has no hands-on time, so 30 minutes was assumed. */
  guessedTimes: boolean
  /** "Brisket has no cooking times, so 30 minutes of work was assumed." */
  assumptions: string[]
}

/** Meals with dishes as core's prep input (each dish keyed by its meal item), and what was assumed per dish. */
export function prepInputs(meals: MealRow[], plan: PlannedMeals, loc: HouseholdLocation) {
  const dishes = new Map<string, PrepDish>()
  const withItems = meals.filter((m) => (plan.items.get(m.id) ?? []).length > 0)
  const dates = withItems.map((m) => m.date).sort()
  const days = dates.length ? calendarDays(dates[0], dates[dates.length - 1], loc) : []
  const byDate = new Map(days.map((d) => [d.date, d]))
  const prepMeals: PrepMeal[] = withItems.map((m) => {
    const day = byDate.get(m.date) ?? calendarDays(m.date, m.date, loc)[0]
    return {
      id: m.id,
      date: m.date,
      ...(m.time !== null && { time: m.time }),
      slot: slotFor(m, day),
      label: m.name,
      items: (plan.items.get(m.id) ?? []).map((it) => {
        const v = it.versionId ? plan.versions.get(it.versionId) : undefined
        if (!v) {
          const title = it.description ?? 'Brought dish'
          dishes.set(it.id, {
            itemId: it.id,
            mealId: m.id,
            title,
            recipeId: null,
            versionId: null,
            brought: true,
            guessedTimes: false,
            assumptions: [],
          })
          return {
            dishId: it.id,
            title,
            activeMinutes: 0,
            totalMinutes: 0,
            servingStyle: 'hot' as const,
            brought: true,
          }
        }
        const title = v.recipe.title
        const active = v.version.activeMinutes
        const guessed = active === null
        dishes.set(it.id, {
          itemId: it.id,
          mealId: m.id,
          title,
          recipeId: v.recipe.id,
          versionId: v.version.id,
          brought: false,
          guessedTimes: guessed,
          assumptions: guessed
            ? [`${title} has no cooking times, so 30 minutes of work was assumed.`]
            : [],
        })
        const a = active ?? 30
        return {
          dishId: it.id,
          title,
          activeMinutes: a,
          totalMinutes: Math.max(v.version.totalMinutes ?? a, a),
          prePrep: (v.version.prePrep ?? []).map((p) => ({
            label: p.step,
            leadMinutes: p.lead_minutes,
          })),
          servingStyle: v.version.servingStyle ?? ('hot' as const),
          holdsOnBlech: v.version.holdsOnBlech ?? undefined,
        }
      }),
    }
  })
  return { prepMeals, dishes, meals: withItems }
}

/** The earliest date each dish (meal item) has a prep task on: a thaw or marinade can start days before the meal. */
export function firstTaskDates(sched: PrepSchedule): Map<string, string> {
  const out = new Map<string, string>()
  for (const t of sched.tasks) {
    if (!t.dishId) continue
    const cur = out.get(t.dishId)
    if (!cur || t.date < cur) out.set(t.dishId, t.date)
  }
  return out
}

const text = (m: number | undefined | null) =>
  m === undefined || m === null ? null : clock(((m % 1440) + 1440) % 1440)

export async function getPrepSchedule(
  db: Db,
  actor: Actor,
  input: { from?: string; to?: string; mealIds?: string[] } = {},
) {
  await settlePassedMeals(db, actor.householdId)
  const loc = await householdLocation(db, actor.householdId)
  const today = todayIn(loc.timeZone)
  const from = input.from ?? today
  const to = input.to ?? addDaysStr(from, 14)
  let inRange = await mealsInRange(db, actor.householdId, from, to)
  if (input.mealIds?.length) {
    const want = new Set(input.mealIds)
    inRange = inRange.filter((m) => want.has(m.id))
  }
  const plan = await planMeals(db, actor.householdId, inRange)
  const { prepMeals, dishes, meals } = prepInputs(inRange, plan, loc)
  const sched = buildPrepSchedule({ location: loc, meals: prepMeals })

  const keys = sched.tasks.map((t) => t.key)
  const marks = keys.length
    ? await inChunks(keys, (part) =>
        db
          .select()
          .from(s.prepDone)
          .where(
            and(
              eq(s.prepDone.householdId, actor.householdId),
              inArray(s.prepDone.taskKey, part),
              isNull(s.prepDone.deletedAt),
            ),
          ),
      )
    : []
  const doneAt = new Map(marks.map((r) => [r.taskKey, r.doneAt]))
  const mealById = new Map(meals.map((m) => [m.id, m]))
  const servedAt = new Map(sched.meals.map((m) => [m.mealId, m.time]))

  const taskView = (t: PrepSchedule['tasks'][number]) => {
    const dish = t.dishId ? dishes.get(t.dishId) : undefined
    const meal = mealById.get(t.mealId)
    return {
      ...t,
      startText: text(t.start),
      endText: text(t.end),
      mealLabel: meal?.name ?? null,
      mealDate: meal?.date ?? null,
      mealTimeText: text(servedAt.get(t.mealId)),
      recipeId: dish?.recipeId ?? null,
      versionId: dish?.versionId ?? null,
      guessedTimes: dish?.guessedTimes ?? false,
      done: doneAt.has(t.key),
      doneAt: doneAt.get(t.key) ?? null,
    }
  }

  const tasks = sched.tasks.map(taskView)
  return {
    from,
    to,
    mealCount: meals.length,
    days: sched.days.map((d) => ({
      ...d,
      candleLightingText: text(d.candleLighting),
      rest: d.rest
        ? {
            ...d.rest,
            startsAtText: text(d.rest.startsAt),
            handsOnEndsAtText: text(d.rest.handsOnEndsAt),
            endsAtText: text(d.rest.endsAt),
          }
        : null,
      meals: d.meals.map((m) => ({ ...m, timeText: text(m.time) })),
      tasks: d.tasks.map(taskView),
    })),
    dishes: [...dishes.values()],
    taskCount: tasks.length,
    doneCount: tasks.filter((t) => t.done).length,
    flags: sched.flags,
    assumptions: unique([...dishes.values()].flatMap((d) => d.assumptions)),
    note: meals.length
      ? null
      : 'No meals with dishes in this range yet. Add dishes to a meal and its prep appears here.',
  }
}

export interface PrepDoneInput {
  /** Task keys from the prep schedule, and whether each is done. */
  marks: { key: string; done: boolean }[]
}

/** Tick prep tasks off (or back on). Keys are the schedule's own; the meal is read from the key and checked. */
export async function setPrepDone(db: Db, actor: Actor, input: PrepDoneInput) {
  if (!input.marks.length) throw invalid('Give at least one task key')
  const mealIds = new Map<string, string | null>()
  for (const m of input.marks) {
    const key = m.key.trim()
    if (!key || key.length > 300) throw invalid('Unknown prep task key')
    if (/^(eruv|blech):\d{4}-\d{2}-\d{2}$/.test(key)) {
      mealIds.set(key, null)
      continue
    }
    const mealId = key.split(':')[0]
    if (!mealId || !key.includes(':')) throw invalid(`Unknown prep task key ${key}`)
    mealIds.set(key, mealId)
  }
  for (const id of unique([...mealIds.values()].filter((x): x is string => !!x)))
    await requireMeal(db, actor, id)

  const existing = await inChunks([...mealIds.keys()], (part) =>
    db
      .select()
      .from(s.prepDone)
      .where(and(eq(s.prepDone.householdId, actor.householdId), inArray(s.prepDone.taskKey, part))),
  )
  const byKey = new Map(existing.map((r) => [r.taskKey, r]))
  const now = Date.now()
  const stmts: unknown[] = []
  for (const m of input.marks) {
    const key = m.key.trim()
    const row = byKey.get(key)
    if (m.done) {
      if (!row)
        stmts.push(
          db.insert(s.prepDone).values({
            householdId: actor.householdId,
            mealId: mealIds.get(key) ?? null,
            taskKey: key,
            doneAt: now,
          }),
        )
      else if (row.deletedAt !== null)
        stmts.push(
          db
            .update(s.prepDone)
            .set({ deletedAt: null, doneAt: now })
            .where(eq(s.prepDone.id, row.id)),
        )
    } else if (row && row.deletedAt === null) {
      stmts.push(db.update(s.prepDone).set({ deletedAt: now }).where(eq(s.prepDone.id, row.id)))
    }
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50) as never)
  return {
    marks: input.marks.map((m) => ({ key: m.key.trim(), done: m.done })),
    message: `${input.marks.filter((m) => m.done).length} marked done, ${input.marks.filter((m) => !m.done).length} unmarked.`,
  }
}
