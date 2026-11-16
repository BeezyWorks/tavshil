import { todayIn } from '@beitecha/engine'
import {
  buildDiningBrief,
  buildPrepSchedule,
  buildShoppingList,
  formatQuantity,
  isPantryStaple,
  type Quantity,
  type ShoppingLine as CoreLine,
} from '@tavshil/core'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import * as s from '../db/schema'
import { loadCatalog, nameKey } from './catalog'
import { clock, inChunks, invalid, notFound, type Actor, type Db } from './ctx'
import { householdLocation } from './households'
import { displayCategory } from './mappers'
import { buildContexts, settlePassedMeals } from './planning'
import { corePantry, mealsInRange, nextChametzCutoff, planMeals, type MealRow } from './plans'
import { getPrefs } from './prefs'
import { addDaysStr, firstTaskDates, prepInputs } from './prep'

// ---------------------------------------------------------------------------------------------------------------
// Shopping list (BRIEF §9): totals come from every meal with dishes minus pantry; order, checked state and manual
// lines are stored. Each line says which meals and dishes need it, how much each meal needs, when it is needed by
// (a thaw or marinade the day before moves it earlier) and whether it is a pantry staple.

export interface ShoppingInput {
  from?: string
  to?: string
  /** Only what these meals need: their own amounts, with the total across every meal alongside. */
  mealIds?: string[]
}

export async function getShoppingList(db: Db, actor: Actor, input: ShoppingInput = {}) {
  const loc = await householdLocation(db, actor.householdId)
  await settlePassedMeals(db, actor.householdId, { loc })
  const today = todayIn(loc.timeZone)
  const from = input.from ?? today
  const to = input.to ?? addDaysStr(from, 30)
  const filter = input.mealIds?.length ? new Set(input.mealIds) : null
  let ranged: MealRow[] = await mealsInRange(db, actor.householdId, from, to)
  if (filter) {
    // A meal asked for by id counts even outside the range.
    const missing = [...filter].filter((id) => !ranged.some((m) => m.id === id))
    const extra = missing.length
      ? await inChunks(missing, (part) =>
          db
            .select()
            .from(s.meals)
            .where(
              and(
                inArray(s.meals.id, part),
                eq(s.meals.householdId, actor.householdId),
                isNull(s.meals.deletedAt),
              ),
            ),
        )
      : []
    if (extra.length !== missing.length) throw notFound('Meal')
    ranged = [...ranged, ...extra].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? 0) - (b.time ?? 0),
    )
  }
  // Independent reads, in parallel: each one is a round trip to D1.
  const [plan, pantry, prefsAll, stored, catalog] = await Promise.all([
    planMeals(db, actor.householdId, ranged),
    corePantry(db, actor.householdId),
    getPrefs(db, actor),
    db
      .select()
      .from(s.shoppingList)
      .where(
        and(eq(s.shoppingList.householdId, actor.householdId), isNull(s.shoppingList.deletedAt)),
      )
      .orderBy(asc(s.shoppingList.position)),
    loadCatalog(db, actor.householdId),
  ])
  const prep = prepInputs(ranged, plan, loc)
  const meals = prep.meals
  const { contexts } = await buildContexts(db, actor, meals, { loc })
  const prefs = prefsAll.display
  const cutoff = nextChametzCutoff(loc, today)

  // When each dish is first needed: its earliest prep task (a thaw the day before), else the meal's day.
  const firstTask = firstTaskDates(buildPrepSchedule({ location: loc, meals: prep.prepMeals }))
  const planned = plan.planned.map((p) => {
    const at = p.itemId ? firstTask.get(p.itemId) : undefined
    return at ? { ...p, neededBy: at } : p
  })
  const full = buildShoppingList(planned, { pantry, chametzCutoff: cutoff, prefs })
  const computed = filter
    ? buildShoppingList(
        planned.filter((p) => filter.has(p.mealId)),
        { pantry, chametzCutoff: cutoff, prefs },
      )
    : full
  const fullOf = new Map(full.map((l) => [l.ingredientId, l]))

  // Sourcing notes ("buy chalav Yisrael butter"), from each meal's dining brief.
  const sourcing = new Map<string, Set<string>>()
  for (const [mealId, ctx] of contexts) {
    if (filter && !filter.has(mealId)) continue
    for (const n of buildDiningBrief(ctx.input).sourcingNotes)
      for (const ing of n.ingredients) {
        const k = nameKey(ing)
        if (!sourcing.has(k)) sourcing.set(k, new Set())
        sourcing.get(k)!.add(n.text)
      }
  }

  const rowOf = new Map(stored.filter((r) => r.ingredientId).map((r) => [r.ingredientId!, r]))
  const mealById = new Map(meals.map((m) => [m.id, m]))
  const fmt = (q: Quantity, name: string, density: number | null) =>
    formatQuantity(q, prefs, { category: displayCategory(name), density }).text
  const amounts = (qs: Quantity[], name: string, density: number | null) =>
    qs.map((q) => ({ amount: q.amount, unit: q.unit, text: fmt(q, name, density) }))
  const joined = (qs: { text: string }[], unquantified: boolean) =>
    qs.length ? qs.map((q) => q.text).join(' + ') : unquantified ? 'as needed' : ''

  const lines = computed.map((l) => {
    const row = rowOf.get(l.ingredientId)
    const ing = catalog.get(l.ingredientId)
    const density = ing?.densityGPerMl ?? null
    const all: CoreLine = fullOf.get(l.ingredientId) ?? l
    const perMeal = all.perMeal.map((pm) => {
      const meal = mealById.get(pm.mealId)
      const needed = amounts(pm.needed, l.name, density)
      return {
        mealId: pm.mealId,
        name: meal?.name ?? '',
        date: pm.mealDate,
        timeText: clock(meal?.time ?? null),
        dishes: pm.dishes.map((d) => d.title ?? '').filter(Boolean),
        itemIds: pm.dishes.map((d) => d.itemId ?? '').filter(Boolean),
        needed,
        amount: joined(needed, pm.unquantified),
        selected: !filter || filter.has(pm.mealId),
      }
    })
    const shared = !!filter && perMeal.some((m) => !m.selected)
    const totalNeeded = amounts(all.needed, l.name, density)
    return {
      key: `ing:${l.ingredientId}`,
      manual: false,
      ingredientId: l.ingredientId,
      name: l.name,
      display: l.display,
      toBuyDisplay: l.toBuyDisplay,
      needed: amounts(l.needed, l.name, density),
      have: amounts(l.have, l.name, density),
      toBuy: amounts(l.toBuy, l.name, density),
      covered: l.covered,
      unquantified: l.unquantified,
      mealIds: l.mealIds,
      meals: perMeal,
      buyBy: l.buyBy as string | null,
      staple: ing?.staple ?? isPantryStaple(l.name),
      /** Set when filtered by meal and other meals need it too: the amount across every meal. */
      total: shared
        ? {
            needed: totalNeeded,
            text: joined(totalNeeded, all.unquantified),
            mealCount: perMeal.length,
          }
        : null,
      checked: row?.checked ?? false,
      note: row?.note ?? null,
      sourcingNotes: [...(sourcing.get(nameKey(l.name)) ?? [])],
      position: row?.position ?? null,
    }
  })
  // Manual lines belong to no meal, so a list filtered by meal leaves them out.
  const manual = filter
    ? []
    : stored
        .filter((r) => !r.ingredientId)
        .map((r) => ({
          key: `manual:${r.id}`,
          manual: true,
          ingredientId: null,
          name: r.manual ?? '',
          display: r.manual ?? '',
          toBuyDisplay: r.manual ?? '',
          needed: [],
          have: [],
          toBuy: [],
          covered: false,
          unquantified: true,
          mealIds: [] as string[],
          meals: [] as (typeof lines)[number]['meals'],
          buyBy: null as string | null,
          staple: false,
          total: null,
          checked: r.checked,
          note: r.note,
          sourcingNotes: [] as string[],
          position: r.position,
        }))
  const all = [...lines, ...manual]
  // Ordered lines first (by stored position), then new ones in the order the meals need them.
  all.sort((a, b) => {
    if (a.position !== null && b.position !== null) return a.position - b.position
    if (a.position !== null) return -1
    if (b.position !== null) return 1
    return 0
  })
  const shown = filter ? meals.filter((m) => filter.has(m.id)) : meals
  return {
    from,
    to,
    mealIds: filter ? [...filter] : null,
    mealCount: shown.length,
    /** The meals with dishes this list draws on (for filter chips). */
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      date: m.date,
      time: m.time,
      timeText: clock(m.time),
      slot: m.slot,
    })),
    lines: all,
    buyCount: all.filter((l) => !l.checked && (l.manual || l.toBuy.length || l.unquantified))
      .length,
    note: shown.length
      ? 'Totals are what the planned meals need minus unexpired use-soon items.'
      : 'No meals with dishes in this range, so there is nothing to buy yet. Add dishes to a meal first.',
  }
}

export interface ShoppingUpdate {
  check?: { key: string; checked: boolean }[]
  /** Line keys in the order they should appear. */
  order?: string[]
  addManual?: (string | { text: string; note?: string })[]
  removeKeys?: string[]
  notes?: { key: string; note: string | null }[]
  uncheckAll?: boolean
}

export async function updateShoppingList(db: Db, actor: Actor, input: ShoppingUpdate) {
  const [stored, catalog] = await Promise.all([
    db
      .select()
      .from(s.shoppingList)
      .where(
        and(eq(s.shoppingList.householdId, actor.householdId), isNull(s.shoppingList.deletedAt)),
      ),
    loadCatalog(db, actor.householdId),
  ])
  let nextPos = stored.reduce((n, r) => Math.max(n, r.position + 1), 0)
  const byKey = new Map<string, (typeof stored)[number]>()
  for (const r of stored) byKey.set(r.ingredientId ? `ing:${r.ingredientId}` : `manual:${r.id}`, r)

  async function row(key: string) {
    const have = byKey.get(key)
    if (have) return have
    const m = /^ing:(.+)$/.exec(key)
    if (!m || !catalog.get(m[1])) throw notFound(`Shopping line ${key}`)
    const [created] = await db
      .insert(s.shoppingList)
      .values({ householdId: actor.householdId, ingredientId: m[1], position: nextPos++ })
      .returning()
    byKey.set(key, created)
    return created
  }

  for (const t of input.addManual ?? []) {
    const text = typeof t === 'string' ? t : t.text
    if (!text.trim()) throw invalid('A manual line needs text')
    const [created] = await db
      .insert(s.shoppingList)
      .values({
        householdId: actor.householdId,
        position: nextPos++,
        manual: text.trim(),
        note: typeof t === 'string' ? null : (t.note ?? null),
      })
      .returning()
    byKey.set(`manual:${created.id}`, created)
  }
  for (const c of input.check ?? [])
    await db
      .update(s.shoppingList)
      .set({ checked: c.checked })
      .where(eq(s.shoppingList.id, (await row(c.key)).id))
  for (const n of input.notes ?? [])
    await db
      .update(s.shoppingList)
      .set({ note: n.note })
      .where(eq(s.shoppingList.id, (await row(n.key)).id))
  if (input.uncheckAll)
    await db
      .update(s.shoppingList)
      .set({ checked: false })
      .where(
        and(eq(s.shoppingList.householdId, actor.householdId), isNull(s.shoppingList.deletedAt)),
      )
  if (input.order) {
    const stmts = []
    for (let i = 0; i < input.order.length; i++) {
      const r = await row(input.order[i])
      stmts.push(db.update(s.shoppingList).set({ position: i }).where(eq(s.shoppingList.id, r.id)))
    }
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50) as never)
  }
  for (const k of input.removeKeys ?? []) {
    const r = byKey.get(k)
    if (r)
      await db
        .update(s.shoppingList)
        .set({ deletedAt: Date.now() })
        .where(eq(s.shoppingList.id, r.id))
  }
  return getShoppingList(db, actor)
}
