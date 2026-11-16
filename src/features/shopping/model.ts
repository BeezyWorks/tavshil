import type { ISODate, ShoppingLine } from '@/lib/api/types'
import { addDays, dayNum, weekdayEnglish } from '@/lib/dates'

/** A meal with something left to buy, for the filter chips. */
export interface ShopMeal {
  mealId: string
  name: string
  date: ISODate
  /** Lines still to buy for it. */
  count: number
}

/** A run of lines that share a buy-by day. */
export interface ShopGroup {
  key: string
  /** "Buy today", "Buy by Thu 19", "Later". */
  title: string
  /** The meals behind it, e.g. "Leil Shabbat, Shabbat lunch". */
  meals: string
  lines: ShoppingLine[]
}

export interface ShopView {
  /** Due within the coming week, soonest first. */
  groups: ShopGroup[]
  /** Needed more than a week out; folded by default. */
  later: ShopGroup | null
  /** Things you made yourself, not tied to a meal. */
  mine: ShoppingLine[]
  /** Staples, folded into one row. */
  pantry: ShoppingLine[]
  /** Ticked off. */
  cart: ShoppingLine[]
}

/** How many days ahead still counts as this shop; the rest is "Later". */
export const LATER_AFTER_DAYS = 7

/** Meals that still have something to buy, by date. */
export function shopMeals(lines: ShoppingLine[]): ShopMeal[] {
  const byId = new Map<string, ShopMeal>()
  for (const l of lines)
    for (const m of l.meals) {
      const cur = byId.get(m.mealId) ?? { mealId: m.mealId, name: m.name, date: m.date, count: 0 }
      if (!l.checked) cur.count++
      byId.set(m.mealId, cur)
    }
  return [...byId.values()]
    .filter((m) => m.count > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name < b.name ? -1 : 1))
}

/** Drop selections whose meal has nothing left to buy. */
export const validSelection = (selected: string[], meals: ShopMeal[]): string[] =>
  selected.filter((id) => meals.some((m) => m.mealId === id))

const unique = <T>(xs: T[]): T[] => [...new Set(xs)]

/** "Thu 19" */
export const dayShort = (date: ISODate): string => `${weekdayEnglish(date, true)} ${dayNum(date)}`

/** Names for a heading: all of them, up to three. */
export const mealNames = (lines: ShoppingLine[]): string => {
  const names = unique(
    lines.flatMap((l) =>
      [...l.meals].sort((a, b) => (a.date < b.date ? -1 : 1)).map((m) => m.name),
    ),
  )
  return names.length > 3
    ? `${names.slice(0, 3).join(', ')} +${names.length - 3}`
    : names.join(', ')
}

/**
 * Split the list for the screen. `today` is the household's date. A picked meal selection is one
 * group, with its earliest buy-by date; with nothing picked the list groups by buy-by day.
 */
export function buildView(
  lines: ShoppingLine[],
  today: ISODate | undefined,
  picked: boolean,
): ShopView {
  const cart = lines.filter((l) => l.checked)
  const open = lines.filter((l) => !l.checked)
  const pantry = open.filter((l) => l.staple && !l.custom)
  const rest = open.filter((l) => !(l.staple && !l.custom))
  const mine = rest.filter((l) => l.custom || (!l.buyBy && l.meals.length === 0))
  const planned = rest.filter((l) => !mine.includes(l))

  const byDay = new Map<string, ShoppingLine[]>()
  for (const l of planned) {
    const day = picked
      ? 'picked'
      : l.buyBy && today && l.buyBy <= today
        ? 'today'
        : (l.buyBy ?? 'today')
    byDay.set(day, [...(byDay.get(day) ?? []), l])
  }
  const keys = [...byDay.keys()].sort((a, b) =>
    a === 'today' ? -1 : b === 'today' ? 1 : a < b ? -1 : 1,
  )
  const horizon = today ? addDays(today, LATER_AFTER_DAYS) : undefined
  const groups: ShopGroup[] = []
  const laterLines: ShoppingLine[] = []
  for (const k of keys) {
    const ls = byDay.get(k)!
    if (!picked && horizon && k !== 'today' && k > horizon) {
      laterLines.push(...ls)
      continue
    }
    const earliest = ls
      .map((l) => l.buyBy)
      .filter(Boolean)
      .sort()[0]
    const title =
      k === 'today'
        ? 'Buy today'
        : k === 'picked'
          ? earliest && today && earliest <= today
            ? 'Buy today'
            : earliest
              ? `Buy by ${dayShort(earliest)}`
              : 'To buy'
          : `Buy by ${dayShort(k)}`
    groups.push({ key: k, title, meals: mealNames(ls), lines: ls })
  }
  const later = laterLines.length
    ? { key: 'later', title: 'Later', meals: mealNames(laterLines), lines: laterLines }
    : null
  return { groups, later, mine, pantry, cart }
}

/** "salt, olive oil, sugar +4" */
export function pantrySummary(lines: ShoppingLine[], show = 3): string {
  const names = lines.slice(0, show).map((l) => l.name.toLowerCase())
  return lines.length > show ? `${names.join(', ')} +${lines.length - show}` : names.join(', ')
}

/** The "for what" line: the dishes that use it, across the meals shown. */
export function forWhat(line: ShoppingLine, picked: boolean): string {
  const meals = line.meals.filter((m) => !picked || m.selected)
  const dishes = unique(meals.flatMap((m) => m.dishes))
  const names = unique(meals.map((m) => m.name))
  const text = dishes.length ? dishes.join(', ') : names.join(', ')
  const others = picked ? unique(line.meals.filter((m) => !m.selected).map((m) => m.name)) : []
  if (line.total && others.length) return `${text} · ${line.total} total with ${others.join(', ')}`
  return text
}

/** "Brisket · 2 kg": the amount beside the name, "here" when other meals need the rest. */
export function amountText(line: ShoppingLine): string {
  if (!line.need) return ''
  return line.total && line.total !== line.need ? `${line.need} here` : line.need
}

/** Move `id` to where `targetId` is in `ids`, for the drag-to-reorder order call. */
export function moveBefore(ids: string[], id: string, targetId: string): string[] {
  const from = ids.indexOf(id)
  if (from < 0 || id === targetId) return ids
  const out = ids.filter((x) => x !== id)
  const to = out.indexOf(targetId)
  if (to < 0) return ids
  // Dragging down lands after the target, up lands before it.
  out.splice(from < ids.indexOf(targetId) ? to + 1 : to, 0, id)
  return out
}
