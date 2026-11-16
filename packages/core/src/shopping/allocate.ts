import { effectiveExpiryMs, toInstant, type PantryItem } from '../pantry/expiry'
import { convertCanonical } from '../units/convert'
import type { CanonicalUnit, IngredientLine } from '../units/types'

/** One meal item that needs ingredients: a recipe version's lines at a scale. Brought dishes set `brought`. */
export interface PlannedMealItem {
  /** Meal (or meal item) id, used to attribute holds and needs. */
  mealId: string
  /** Meal date ("2026-11-13") or date-time; pantry expiry is checked against it. */
  mealDate: string
  lines: IngredientLine[]
  /** Scale factor applied to every line. */
  scale: number
  /** Brought dishes are excluded from shopping and holds. */
  brought?: boolean
  /** The meal item (dish) this is, and its title, to say what a shopping line is for. */
  itemId?: string
  title?: string
  /**
   * The date its ingredients are first needed, when earlier than the meal (a thaw or marinade step the day
   * before). Defaults to the meal's date.
   */
  neededBy?: string
}

export interface Need {
  mealId: string
  mealDate: string
  itemId?: string
  title?: string
  /** YYYY-MM-DD: when it is first needed (`neededBy`, else the meal's date). */
  neededBy: string
  at: number
  ingredientId: string
  name: string
  /** Null = "to taste" with no quantity. */
  amount: number | null
  unit: CanonicalUnit
  approx: boolean
  density: number | null
  category?: string
}

export interface Draw {
  need: Need
  pantryId: string
  /** Amount drawn, in the need's unit. */
  amount: number
  /** Amount drawn, in the pantry item's unit. */
  itemAmount: number
  /** True when density was used to convert between weight and volume. */
  converted: boolean
}

/** Flatten meal items into per-ingredient needs. Skips brought dishes, bad scales and zero/negative amounts. */
export function buildNeeds(items: PlannedMealItem[]): Need[] {
  const needs: Need[] = []
  for (const it of items) {
    if (it.brought) continue
    if (!Number.isFinite(it.scale) || it.scale <= 0) continue
    const at = toInstant(it.mealDate, 'start')
    for (const l of it.lines) {
      if (l.amount === null) {
        needs.push(mk(it, at, l, null))
        continue
      }
      const amount = l.amount * it.scale
      if (!Number.isFinite(amount) || amount <= 0) continue
      needs.push(mk(it, at, l, amount))
    }
  }
  return needs
}

function mk(it: PlannedMealItem, at: number, l: IngredientLine, amount: number | null): Need {
  return {
    mealId: it.mealId,
    mealDate: it.mealDate,
    ...(it.itemId !== undefined && { itemId: it.itemId }),
    ...(it.title !== undefined && { title: it.title }),
    neededBy: earlier(it.neededBy, it.mealDate.slice(0, 10)),
    at,
    ingredientId: l.ingredientId,
    name: l.name,
    amount,
    unit: l.unit,
    approx: !!l.approx,
    density: l.density && l.density > 0 ? l.density : null,
    ...(l.category !== undefined && { category: l.category }),
  }
}

function earlier(a: string | undefined, b: string): string {
  const x = a?.slice(0, 10)
  return x && x < b ? x : b
}

const EPS = 1e-9

/**
 * Allocate pantry stock to needs chronologically. A pantry item can only cover a meal on or before its
 * effective expiry (chametz items stop at the cutoff); items expiring soonest are used first. Weight and
 * volume only mix when a density is known (from the need or the pantry item).
 */
export function allocatePantry(
  needs: Need[],
  pantry: PantryItem[],
  chametzCutoff?: string | null,
): Draw[] {
  const stock = pantry
    .filter((p) => p.amount > 0 && Number.isFinite(p.amount))
    .map((p) => ({ p, left: p.amount, exp: effectiveExpiryMs(p, chametzCutoff) }))
  const draws: Draw[] = []
  const order = needs.filter((n) => n.amount !== null).sort((a, b) => a.at - b.at)
  for (const need of order) {
    let remaining = need.amount as number
    const candidates = stock
      .filter((s) => s.p.ingredientId === need.ingredientId && s.left > EPS)
      .filter((s) => s.exp === null || need.at <= s.exp)
      .sort((a, b) => (a.exp ?? Infinity) - (b.exp ?? Infinity))
    for (const s of candidates) {
      if (remaining <= EPS) break
      const density = need.density ?? s.p.density ?? null
      const availInNeed = convertCanonical({ amount: s.left, unit: s.p.unit }, need.unit, density)
      if (!availInNeed || availInNeed.amount <= EPS) continue
      const take = Math.min(remaining, availInNeed.amount)
      const itemAmount = Math.min(s.left, (take / availInNeed.amount) * s.left)
      s.left -= itemAmount
      remaining -= take
      draws.push({
        need,
        pantryId: s.p.id,
        amount: take,
        itemAmount,
        converted: s.p.unit !== need.unit,
      })
    }
  }
  return draws
}
