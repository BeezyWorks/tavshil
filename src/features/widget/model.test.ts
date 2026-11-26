import { describe, expect, it } from 'vitest'

import type { MealCard, PlanView, PrepDay } from '@/lib/api/types'

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
  const task = (over: Record<string, unknown>) => ({
    id: String(over.text),
    kind: 'active',
    mealName: 'Dinner',
    mealId: 'm1',
    done: false,
    ...over,
  })
  const prep = [
    {
      date: '2026-11-19',
      meals: [],
      tasks: [
        task({ time: '5:00 PM', text: 'Roast', versionId: 'v1' }),
        task({ time: '9:00 AM', text: 'Marinate', done: true }),
        task({ time: '3:00 PM', text: 'Rise', kind: 'passive', passive: true, endTime: '4:00 PM' }),
      ],
    },
    { date: '2026-11-20', meals: [], tasks: [task({ time: '8:00 AM', text: 'Bake' })] },
  ] as unknown as PrepDay[]

  it('builds the cook-next card and today’s prep, open tasks first', () => {
    const s = buildSnapshot({
      today: '2026-11-19',
      nowMin: 12 * 60,
      now: 1,
      view: view([
        day('2026-11-19', [
          meal({
            headcount: { total: 6 },
            hosted: true,
            dishes: [
              { title: 'Rice', course: 'side' },
              { title: 'Silan chicken', course: 'main', versionId: 'v9' },
            ],
          } as Partial<MealCard>),
        ]),
      ]),
      prep,
    })
    expect(s.next).toEqual({
      kicker: 'Tonight’s dinner · 7:00',
      title: 'Silan chicken',
      sub: 'Start at 3:00 · 6 people',
      cookUrl: 'tavshil://cook/v9',
    })
    expect(s.prep.tasks.map((t) => t.text)).toEqual(['Rise', 'Roast', 'Marinate'])
    expect(s.prep.tasks[0]).toMatchObject({
      time: '3:00 pm',
      sub: 'Passive · until 4:00 pm · Dinner',
      cookUrl: null,
    })
    expect(s.prep.tasks[1].cookUrl).toBe('tavshil://cook/v1')
    expect(s.prep.left).toBe(2)
  })

  it('is empty-safe before anything loads', () => {
    const s = buildSnapshot({
      today: '2026-11-19',
      nowMin: null,
      now: 1,
      view: undefined,
      prep: undefined,
    })
    expect(s.next).toBeNull()
    expect(s.prep).toEqual({ tasks: [], left: 0 })
  })
})
