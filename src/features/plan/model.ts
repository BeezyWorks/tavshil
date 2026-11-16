import type {
  ISODate,
  MealCard,
  PlanView,
  PrepDay,
  PrepTask,
  RecipeSummary,
  RunSummary,
  ShoppingLine,
  WeekDay,
} from '@/lib/api/types'
import { addDays, clockMinutes, hebrewDate, weekdayName } from '@/lib/dates'

/** What the week draws: a plain day, or one block for a run of Shabbat / Yom Tov days. */
export type Segment =
  { kind: 'day'; day: WeekDay } | { kind: 'run'; run: RunSummary; days: WeekDay[] }

/** Group consecutive holy-day dates of the same run into one block (clipped to the days we have). */
export function buildSegments(days: WeekDay[], runs: RunSummary[]): Segment[] {
  const out: Segment[] = []
  for (const day of days) {
    const run = day.holyDay ? runs.find((r) => r.key === day.holyDay!.runKey) : undefined
    if (!day.holyDay || !run) {
      out.push({ kind: 'day', day })
      continue
    }
    const last = out[out.length - 1]
    if (last && last.kind === 'run' && last.run.key === run.key) last.days.push(day)
    else out.push({ kind: 'run', run, days: [day] })
  }
  return out
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Whether today is inside the week on screen. */
export const isThisWeek = (view: Pick<PlanView, 'today' | 'from' | 'to'>) =>
  view.today >= view.from && view.today <= view.to

/** `Monday · 6 Kislev · week of Vayetzei`: today when it is in the week, else the week's first day. */
export function headerKicker(view: PlanView): string {
  const date = isThisWeek(view) ? view.today : view.from
  const parts = [weekdayName(date), hebrewDate(date)]
  if (view.parasha) parts.push(`week of ${view.parasha}`)
  return parts.filter(Boolean).join(' · ')
}

/** `Cheshvan – Kislev 5787` for the first and last day of a month. */
export function hebrewMonthsLabel(first: ISODate, last: ISODate): string {
  const name = (d: ISODate) => hebrewDate(d).split(' ').slice(1).join(' ')
  let year = ''
  try {
    year =
      new Intl.DateTimeFormat('en-u-ca-hebrew', { year: 'numeric', timeZone: 'UTC' })
        .formatToParts(new Date(`${last}T12:00:00Z`))
        .find((p) => p.type === 'year')?.value ?? ''
  } catch {
    year = ''
  }
  const a = name(first)
  const b = name(last)
  return `${a === b ? a : `${a} – ${b}`} ${year}`.trim()
}

/** The main dish of a meal (else the first). */
export function mainDish(meal: MealCard) {
  return meal.dishes.find((d) => d.course === 'main') ?? meal.dishes[0]
}

/** `{ lead: 'Shakshuka', more: 2 }`: the main dish and how many others come with it. */
export function dishSummary(meal: MealCard): { lead: string; more: number } {
  const main = mainDish(meal)
  if (!main) return { lead: meal.summary[0] ?? '', more: 0 }
  return { lead: main.title, more: meal.dishes.length - 1 }
}

/** The slot's own name: `Dinner`, `Leil Shabbat`, `Lunch`. */
export const slotName = (meal: Pick<MealCard, 'slotLabel' | 'name'> & { runKey?: string | null }) =>
  (meal.runKey ? meal.name : meal.slotLabel) || meal.name

export type Tonight =
  | { kind: 'meal'; meal: MealCard }
  | { kind: 'eve'; eve: NonNullable<WeekDay['eve']> }
  | { kind: 'none'; date: ISODate }

/** Tonight's dinner: Friday night belongs to Shabbat (the eve), else the day's dinner meal. */
export function tonightOf(days: WeekDay[], today: ISODate): Tonight {
  const day = days.find((d) => d.date === today)
  if (day?.eve)
    return day.eve.meal ? { kind: 'meal', meal: day.eve.meal } : { kind: 'eve', eve: day.eve }
  const meal = day?.meals.find((m) => m.slot === 'dinner')
  return meal ? { kind: 'meal', meal } : { kind: 'none', date: today }
}

/** `5:50 PM` to `5:50`. */
export const clockShort = (t: string) => t.replace(/\s*(AM|PM)$/i, '')

/** The first not-done prep task of a meal on `date`: `5:50 PM`, or null. */
export function startTime(days: PrepDay[], mealId: string, date: ISODate): string | null {
  let best: { t: string; m: number } | null = null
  for (const d of days)
    if (d.date === date)
      for (const t of d.tasks) {
        if (t.mealId !== mealId || t.done) continue
        const m = clockMinutes(t.time)
        if (m !== null && (!best || m < best.m)) best = { t: t.time, m }
      }
  return best ? best.t : null
}

export interface NextTask {
  task: PrepTask
  date: ISODate
  /** `Today 5:50 PM`, `Thu 8:00 AM`. */
  when: string
}

/** The next `n` not-done tasks from today on, in time order. */
export function nextTasks(days: PrepDay[], today: ISODate, n = 3): NextTask[] {
  const out: (NextTask & { m: number })[] = []
  for (const d of days)
    if (d.date >= today)
      for (const task of d.tasks) {
        if (task.done) continue
        const day = d.date === today ? 'Today' : weekdayName(d.date, true)
        out.push({
          task,
          date: d.date,
          when: `${day} ${task.time}`,
          m: clockMinutes(task.time) ?? 0,
        })
      }
  out.sort((a, b) => (a.date === b.date ? a.m - b.m : a.date < b.date ? -1 : 1))
  return out.slice(0, n).map(({ task, date, when }) => ({ task, date, when }))
}

/** Unchecked, non-staple lines still to buy. */
export const toBuy = (lines: ShoppingLine[] | undefined) =>
  (lines ?? []).filter((l) => !l.checked && !l.staple)

export interface BuyCounts {
  today: number
  /** The next day after today anything is due, and how many lines are due on or before it (after today). */
  by: { date: ISODate; count: number } | null
}

export function buyCounts(lines: ShoppingLine[] | undefined, today: ISODate): BuyCounts {
  const open = toBuy(lines)
  const now = open.filter((l) => l.buyBy !== undefined && l.buyBy <= today).length
  const later = open.filter((l) => l.buyBy !== undefined && l.buyBy > today)
  if (!later.length) return { today: now, by: null }
  const date = later.map((l) => l.buyBy!).sort()[0]
  return { today: now, by: { date, count: later.filter((l) => l.buyBy! <= date).length } }
}

/** What one meal still needs from the shop: its own amounts, and the earliest buy-by. */
export function mealShopping(lines: ShoppingLine[] | undefined, mealId: string) {
  const mine = toBuy(lines).filter((l) => l.meals.some((m) => m.mealId === mealId))
  const items = mine.map((l) => {
    const amount = l.meals.find((m) => m.mealId === mealId)?.amount ?? ''
    return { name: l.name, amount: amount && amount !== 'as needed' ? amount : '' }
  })
  const dates = mine.map((l) => l.buyBy).filter((d): d is ISODate => !!d)
  return { items, buyBy: dates.length ? dates.sort()[0] : null }
}

/** `Eggs 8 · feta 200 g · pita 6`, with a `+3 more` tail. */
export function buyLine(items: { name: string; amount: string }[], max = 4): string {
  const shown = items.slice(0, max).map((i) => (i.amount ? `${i.name} ${i.amount}` : i.name))
  const rest = items.length - shown.length
  return rest > 0 ? `${shown.join(' · ')} · +${rest} more` : shown.join(' · ')
}

/** Recipes cooked lately: most recently served first, then the rest. */
export function cookedLately(recipes: RecipeSummary[] | undefined, n = 5): RecipeSummary[] {
  const all = recipes ?? []
  const served = all
    .filter((r) => r.lastServed)
    .sort((a, b) => (a.lastServed! < b.lastServed! ? 1 : -1))
  const rest = all.filter((r) => !r.lastServed)
  return [...served, ...rest].slice(0, n)
}

/** `last made 2 weeks ago`, relative to `today`. */
export function lastMade(last: ISODate | undefined, today: ISODate): string {
  if (!last) return ''
  const t = (d: ISODate) => new Date(`${d}T12:00:00Z`).getTime()
  const days = Math.round((t(today) - t(last)) / 86400000)
  if (days <= 0) return 'made today'
  if (days < 7) return days === 1 ? 'made yesterday' : `made ${days} days ago`
  if (days < 30) {
    const w = Math.round(days / 7)
    return `last made ${w === 1 ? 'a week' : `${w} weeks`} ago`
  }
  const m = Math.round(days / 30)
  return `last made ${m === 1 ? 'a month' : `${m} months`} ago`
}

/** The strip / sheet title for a meal: `Tonight’s dinner`, `Tomorrow’s dinner`, `Tuesday dinner`. */
export function mealTitle(meal: Pick<MealCard, 'date' | 'slotLabel' | 'name'>, today: ISODate) {
  const slot = slotName(meal).toLowerCase()
  const dinner = slot === 'dinner'
  if (meal.date === today) return dinner ? 'Tonight’s dinner' : `Today’s ${slot}`
  if (meal.date === addDays(today, 1)) return dinner ? 'Tomorrow’s dinner' : `Tomorrow’s ${slot}`
  return `${weekdayName(meal.date)} ${slot}`
}

/** `Mon 16` */
export const dayLabel = (date: ISODate) => `${weekdayName(date, true)} ${Number(date.slice(8))}`

/** Where a meal tap goes: straight to its recipe, a panel, or the hosted page. */
export type MealTap =
  { kind: 'recipe'; recipeId: string } | { kind: 'panel' } | { kind: 'hosted'; key: string }

export function tapOf(meal: MealCard): MealTap {
  if (meal.hosted) return { kind: 'hosted', key: meal.hostedKey }
  if (meal.dishes.length === 1 && meal.dishes[0].recipeId)
    return { kind: 'recipe', recipeId: meal.dishes[0].recipeId }
  return { kind: 'panel' }
}

/** Meal id to the holy day it is for (`Shabbat`, `Pesach I`), for notes like "2 prep for Shabbat". */
export function runMealLabels(runs: RunSummary[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const r of runs)
    for (const h of r.holyDays) for (const m of h.meals) if (m.id) out.set(m.id, h.label)
  return out
}

/** `2 prep for Shabbat` (or `2 prep tasks for Shabbat` when `long`); empty for none. */
export function prepNote(tasks: PrepTask[], labels: Map<string, string>, long: boolean): string {
  if (!tasks.length) return ''
  const names = new Set(tasks.map((t) => (t.mealId ? labels.get(t.mealId) : undefined)))
  const label = names.size === 1 ? [...names][0] : undefined
  const base = long ? plural(tasks.length, 'prep task', 'prep tasks') : `${tasks.length} prep`
  return label ? `${base} for ${label}` : base
}

/** The meals of a holy day, from its run (they are not in `day.meals`). */
export function holyMeals(day: WeekDay, runs: RunSummary[]): MealCard[] {
  if (!day.holyDay) return []
  const run = runs.find((r) => r.key === day.holyDay!.runKey)
  return run?.holyDays.find((h) => h.date === day.date)?.meals ?? []
}
