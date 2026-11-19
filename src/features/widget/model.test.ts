import { describe, expect, it } from 'vitest'

import type { MealCard, PlanView, PrepDay, ShoppingLine } from '@/lib/api/types'

import { buildSnapshot, nextMeal } from './model'

const meal = (over: Partial<MealCard> = {}): MealCard =>
  ({
    id: 'm1',
    virtual: false,
    date: '2026-11-19',
    slot: 'dinner',
    slotLabel: 'Dinner',
    name: 'Dinner',
    time: 19 * 60,
    timeText: '19:00',
    guestOf: null,
    runKey: null,
    hostedKey: 'meal-m1',
    planned: true,
    dishes: [{ title: 'Silan chicken' }, { title: 'Rice' }],
    ...over,
  }) as MealCard

const day = (date: string, meals: MealCard[] = [], over = {}) => ({
  date,
  isToday: false,
  isShabbat: false,
  holidays: [],
  holyDay: null,
  eve: null,
  meals,
  ...over,
})

const view = (days: ReturnType<typeof day>[]): PlanView =>
  ({ today: '2026-11-19', parasha: 'Toldot', runs: [], days }) as unknown as PlanView

describe('nextMeal', () => {
  it('skips meals already past, virtual ones and meals we are guests at', () => {
    const v = view([
      day('2026-11-19', [
        meal({ id: 'a', time: 8 * 60 }),
        meal({ id: 'b', virtual: true }),
        meal({ id: 'c', guestOf: 'the Blochs' }),
        meal({ id: 'd', time: 20 * 60 }),
      ]),
      day('2026-11-20', [meal({ id: 'e', date: '2026-11-20' })]),
    ])
    expect(nextMeal(v, 12 * 60)?.id).toBe('d')
    expect(nextMeal(v, 21 * 60)?.id).toBe('e')
  })
})

describe('buildSnapshot', () => {
  const prep = [
    {
      date: '2026-11-19',
      tasks: [
        { time: '5:00 PM', text: 'Roast', done: false },
        { time: '9:00 AM', text: 'Marinate', done: true },
      ],
    },
    { date: '2026-11-20', tasks: [{ time: '8:00 AM', text: 'Bake', done: false }] },
  ] as unknown as PrepDay[]
  const shopping = [
    { name: 'Onions', checked: false, staple: false },
    { name: 'Salt', checked: false, staple: true },
    { name: 'Chicken', checked: true, staple: false },
  ] as unknown as ShoppingLine[]

  it('collects next meal, today’s prep in time order, and what is left to buy', () => {
    const s = buildSnapshot({
      today: '2026-11-19',
      nowMin: 12 * 60,
      now: 1,
      view: view([day('2026-11-19', [meal()])]),
      prep,
      shopping,
    })
    expect(s.next).toMatchObject({ title: 'Tonight’s dinner', when: '7:00 pm' })
    expect(s.next?.dishes).toEqual(['Silan chicken', 'Rice'])
    expect(s.prep.tasks.map((t) => t.text)).toEqual(['Marinate', 'Roast'])
    expect(s.prep.left).toBe(1)
    expect(s.shopping).toEqual({ count: 1, items: ['Onions'] })
    expect(s.week[0]).toMatchObject({ today: true, meals: ['Dinner'] })
  })

  it('is empty-safe before anything loads', () => {
    const s = buildSnapshot({
      today: '2026-11-19',
      nowMin: null,
      now: 1,
      view: undefined,
      prep: undefined,
      shopping: undefined,
    })
    expect(s.next).toBeNull()
    expect(s.week).toEqual([])
  })
})
