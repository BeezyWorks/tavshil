import { describe, expect, it } from 'vitest'

import type { MealCard, PrepDay, PrepTask, ShoppingLine, WeekDay } from '@/lib/api/types'

import {
  buyCounts,
  buyLine,
  cookedLately,
  dishSummary,
  lastMade,
  mealShopping,
  mealTitle,
  nextTasks,
  prepNote,
  startTime,
  tapOf,
  tonightOf,
} from './model'

const meal = (over: Partial<MealCard> = {}): MealCard =>
  ({
    id: 'm1',
    date: '2026-11-10',
    slot: 'dinner',
    slotLabel: 'Dinner',
    name: 'Dinner',
    hosted: false,
    hostedKey: 'meal-m1',
    runKey: null,
    virtual: false,
    summary: [],
    dishes: [],
    ...over,
  }) as MealCard

const dish = (title: string, recipeId: string | null = 'r1', course = 'main') => ({
  itemId: title,
  title,
  course,
  recipeId,
  versionId: recipeId ? `v-${recipeId}` : null,
})

const task = (over: Partial<PrepTask>): PrepTask =>
  ({
    id: 't',
    time: '5:50 PM',
    text: 'Cook',
    mealId: 'm1',
    done: false,
    ...over,
  }) as PrepTask

const day = (date: string, tasks: PrepTask[]): PrepDay =>
  ({ id: date, label: date, date, tasks, meals: [] }) as PrepDay

describe('tapOf', () => {
  it('goes straight to the recipe for one recipe dish', () => {
    expect(tapOf(meal({ dishes: [dish('Silan chicken', 'r9')] }))).toEqual({
      kind: 'recipe',
      recipeId: 'r9',
    })
  })
  it('opens the panel for several dishes, none, or one without a recipe', () => {
    expect(tapOf(meal({ dishes: [dish('a'), dish('b', 'r2')] })).kind).toBe('panel')
    expect(tapOf(meal()).kind).toBe('panel')
    expect(tapOf(meal({ dishes: [dish('Pita', null)] })).kind).toBe('panel')
  })
  it('opens the hosted page for hosted meals', () => {
    expect(tapOf(meal({ hosted: true, dishes: [dish('a')] }))).toEqual({
      kind: 'hosted',
      key: 'meal-m1',
    })
  })
})

describe('dishSummary', () => {
  it('leads with the main dish and counts the rest', () => {
    const m = meal({
      dishes: [dish('Salad', 'r2', 'salad'), dish('Shakshuka'), dish('Pita', null)],
    })
    expect(dishSummary(m)).toEqual({ lead: 'Shakshuka', more: 2 })
  })
})

describe('tonightOf', () => {
  const base = { holidays: [], meals: [], eve: null } as unknown as WeekDay
  it('finds the dinner', () => {
    const d = { ...base, date: '2026-11-10', meals: [meal()] } as WeekDay
    expect(tonightOf([d], '2026-11-10').kind).toBe('meal')
  })
  it('is empty when there is no dinner', () => {
    const d = { ...base, date: '2026-11-10' } as WeekDay
    expect(tonightOf([d], '2026-11-10')).toEqual({ kind: 'none', date: '2026-11-10' })
  })
  it('gives Friday night to Shabbat', () => {
    const eve = { runKey: 'run-x', holyDate: '2026-11-14', mealName: 'Leil Shabbat', meal: null }
    const d = { ...base, date: '2026-11-13', meals: [meal()], eve } as unknown as WeekDay
    expect(tonightOf([d], '2026-11-13').kind).toBe('eve')
  })
})

describe('prep helpers', () => {
  const days = [
    day('2026-11-10', [
      task({ id: 'a', time: '6:30 PM' }),
      task({ id: 'b', time: '5:50 PM' }),
      task({ id: 'c', time: '4:00 PM', done: true }),
      task({ id: 'd', time: '5:00 PM', mealId: 'other' }),
    ]),
    day('2026-11-12', [task({ id: 'e', time: '8:00 AM', mealId: 'm2' })]),
    day('2026-11-08', [task({ id: 'old' })]),
  ]
  it('starts at the first task of the meal that day that is not done', () => {
    expect(startTime(days, 'm1', '2026-11-10')).toBe('5:50 PM')
    expect(startTime(days, 'm1', '2026-11-12')).toBeNull()
  })
  it('lists the next tasks in time order, skipping done and past ones', () => {
    const next = nextTasks(days, '2026-11-10', 3)
    expect(next.map((n) => n.task.id)).toEqual(['d', 'b', 'a'])
    expect(next[0].when).toBe('Today 5:00 PM')
    expect(nextTasks(days, '2026-11-10', 5).pop()?.when).toBe('Thu 8:00 AM')
  })
  it('words the note by the holy day the tasks are for', () => {
    const labels = new Map([['m1', 'Shabbat']])
    expect(prepNote([task({}), task({})], labels, false)).toBe('2 prep for Shabbat')
    expect(prepNote([task({})], labels, true)).toBe('1 prep task for Shabbat')
    expect(prepNote([task({ mealId: 'x' })], labels, false)).toBe('1 prep')
    expect(prepNote([], labels, false)).toBe('')
  })
})

describe('shopping helpers', () => {
  const line = (over: Partial<ShoppingLine>): ShoppingLine =>
    ({
      id: 'l',
      name: 'Eggs',
      need: '8',
      checked: false,
      staple: false,
      meals: [],
      ...over,
    }) as ShoppingLine
  const lines = [
    line({ id: '1', buyBy: '2026-11-10' }),
    line({ id: '2', buyBy: '2026-11-12' }),
    line({ id: '3', buyBy: '2026-11-12' }),
    line({ id: '4', buyBy: '2026-11-14' }),
    line({ id: '5', buyBy: '2026-11-12', staple: true }),
    line({ id: '6', buyBy: '2026-11-12', checked: true }),
  ]
  it('counts today and the next buy-by day, without staples or ticked lines', () => {
    expect(buyCounts(lines, '2026-11-10')).toEqual({
      today: 1,
      by: { date: '2026-11-12', count: 2 },
    })
    expect(buyCounts([], '2026-11-10')).toEqual({ today: 0, by: null })
  })
  it("sums up one meal's needs", () => {
    const l = [
      line({
        name: 'Eggs',
        buyBy: '2026-11-11',
        meals: [{ mealId: 'm1', amount: '8' } as never],
      }),
      line({
        name: 'Salt',
        buyBy: '2026-11-11',
        meals: [{ mealId: 'm1', amount: 'as needed' } as never],
      }),
      line({ name: 'Flour', meals: [{ mealId: 'm2', amount: '1 kg' } as never] }),
    ]
    const r = mealShopping(l, 'm1')
    expect(r.items).toEqual([
      { name: 'Eggs', amount: '8' },
      { name: 'Salt', amount: '' },
    ])
    expect(r.buyBy).toBe('2026-11-11')
    expect(buyLine(r.items)).toBe('Eggs 8 · Salt')
    expect(
      buyLine(
        Array.from({ length: 6 }, (_, i) => ({ name: `n${i}`, amount: '' })),
        2,
      ),
    ).toBe('n0 · n1 · +4 more')
  })
})

describe('cooked lately', () => {
  it('puts the most recently served recipes first', () => {
    const r = (id: string, lastServed?: string) => ({ id, lastServed }) as never
    const out = cookedLately([r('a', '2026-10-01'), r('b'), r('c', '2026-11-01')], 3) as {
      id: string
    }[]
    expect(out.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })
  it('says how long ago', () => {
    expect(lastMade('2026-10-27', '2026-11-10')).toBe('last made 2 weeks ago')
    expect(lastMade('2026-10-10', '2026-11-10')).toBe('last made a month ago')
    expect(lastMade('2026-11-09', '2026-11-10')).toBe('made yesterday')
    expect(lastMade(undefined, '2026-11-10')).toBe('')
  })
})

describe('mealTitle', () => {
  it('names tonight, tomorrow and other days', () => {
    const m = (date: string) => ({ date, slotLabel: 'Dinner', name: 'Dinner' })
    expect(mealTitle(m('2026-11-10'), '2026-11-10')).toBe('Tonight’s dinner')
    expect(mealTitle(m('2026-11-11'), '2026-11-10')).toBe('Tomorrow’s dinner')
    expect(mealTitle(m('2026-11-12'), '2026-11-10')).toBe('Thursday dinner')
  })
})
