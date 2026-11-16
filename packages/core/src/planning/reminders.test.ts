import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  MAX_REMINDERS,
  parseClock,
  planReminders,
  restWindowsFromCalendar,
  zonedEpoch,
  type ReminderDay,
  type ReminderTask,
  type RestWindow,
} from './reminders'

const TZ = 'America/New_York'
// Monday 16 Nov 2026, noon in New York (EST, UTC-5).
const NOW = zonedEpoch('2026-11-16', 12 * 60, TZ)
const at = (date: string, hhmm: string) => zonedEpoch(date, parseClock(hhmm) as number, TZ)

// Shabbat 20-21 Nov: candles 4:28 PM Friday, havdalah 5:27 PM Saturday.
const SHABBAT: RestWindow = {
  startDate: '2026-11-20',
  startMin: parseClock('16:28') as number,
  endDate: '2026-11-21',
  endMin: parseClock('17:27') as number,
}

const task = (over: Partial<ReminderTask> = {}): ReminderTask => ({
  id: 't1',
  kind: 'passive',
  startMin: parseClock('09:00'),
  text: 'Marinate chicken',
  mealName: 'Friday night dinner',
  ...over,
})
const day = (date: string, ...tasks: ReminderTask[]): ReminderDay => ({ date, tasks })
const plan = (days: ReminderDay[], over: Partial<Parameters<typeof planReminders>[0]> = {}) =>
  planReminders({
    days,
    rests: [SHABBAT],
    settings: DEFAULT_SETTINGS,
    timeZone: TZ,
    now: NOW,
    ...over,
  })

describe('zonedEpoch', () => {
  it('uses the zone offset on that date, across a clock change', () => {
    expect(new Date(zonedEpoch('2026-11-16', 540, TZ)).toISOString()).toBe(
      '2026-11-16T14:00:00.000Z',
    )
    expect(new Date(zonedEpoch('2026-07-16', 540, TZ)).toISOString()).toBe(
      '2026-07-16T13:00:00.000Z',
    )
    expect(new Date(zonedEpoch('2026-11-16', 540, 'Asia/Jerusalem')).toISOString()).toBe(
      '2026-11-16T07:00:00.000Z',
    )
  })
})

describe('planReminders', () => {
  it('defaults: pre-prep on, cooking off, 15 minutes before', () => {
    const r = plan([
      day(
        '2026-11-18',
        task({ id: 'a' }),
        task({ id: 'b', kind: 'setup', text: 'Soak beans', startMin: 600 }),
        task({ id: 'c', kind: 'active', text: 'Start the kugel', startMin: 840 }),
      ),
    ])
    expect(r.map((x) => x.title)).toEqual(['Marinate chicken', 'Soak beans'])
    expect(r[0].fireAt).toBe(at('2026-11-18', '08:45'))
    expect(r[0].body).toBe('For Friday night dinner')
    expect(r[0].url).toBe('/prep')
  })

  it('schedules active tasks only when cooking is on, and can turn pre-prep off', () => {
    const days = [
      day('2026-11-18', task({ id: 'a' }), task({ id: 'c', kind: 'active', startMin: 840 })),
    ]
    const both = plan(days, { settings: { ...DEFAULT_SETTINGS, cooking: true } })
    expect(both).toHaveLength(2)
    const cookingOnly = plan(days, { settings: { prePrep: false, cooking: true, lead: 15 } })
    expect(cookingOnly.map((x) => x.id)).toEqual(['prep:2026-11-18:c'])
    expect(plan(days, { settings: { prePrep: false, cooking: false, lead: 15 } })).toEqual([])
  })

  it.each([
    [0, '09:00'],
    [15, '08:45'],
    [30, '08:30'],
    [60, '08:00'],
  ] as const)('lead time %i minutes', (lead, expected) => {
    const r = plan([day('2026-11-18', task())], { settings: { ...DEFAULT_SETTINGS, lead } })
    expect(r[0].fireAt).toBe(at('2026-11-18', expected))
  })

  it('skips done tasks and times already past', () => {
    const r = plan([
      day(
        '2026-11-16',
        task({ id: 'past', startMin: 11 * 60 }),
        task({ id: 'soon', startMin: 12 * 60 + 10 }),
        task({ id: 'done', startMin: 15 * 60, done: true }),
      ),
    ])
    // 12:10 minus 15 minutes is 11:55, before noon: gone too.
    expect(r).toEqual([])
    const later = plan([day('2026-11-16', task({ id: 'ok', startMin: 12 * 60 + 30 }))])
    expect(later.map((x) => x.id)).toEqual(['prep:2026-11-16:ok'])
  })

  it('skips anything beyond the next 7 days', () => {
    const r = plan([day('2026-11-23', task()), day('2026-11-24', task({ id: 'far' }))])
    expect(r.map((x) => x.id)).toEqual(['prep:2026-11-23:t1'])
  })

  it('moves a reminder that would land in Shabbat to 30 minutes before candle lighting', () => {
    // Saturday 3:00 PM task (passive, e.g. after a long soak) with a 15 minute lead.
    const r = plan([day('2026-11-21', task({ startMin: 15 * 60 }))])
    expect(r).toHaveLength(1)
    expect(r[0].fireAt).toBe(at('2026-11-20', '15:58'))
  })

  it('moves it to when hands-on cooking ends, when that is known', () => {
    const rest: RestWindow = { ...SHABBAT, handsOnEndsMin: parseClock('15:30') }
    const r = plan([day('2026-11-21', task({ startMin: 10 * 60 }))], { rests: [rest] })
    expect(r[0].fireAt).toBe(at('2026-11-20', '15:30'))
  })

  it('does not move a reminder that just misses the start or end of the window', () => {
    // 4:27 PM Friday minus 15 minutes is before candles: untouched.
    const before = plan([day('2026-11-20', task({ startMin: parseClock('16:27') }))])
    expect(before[0].fireAt).toBe(at('2026-11-20', '16:12'))
    // Saturday 5:42 PM minus 15 minutes is 5:27 PM, havdalah: it may ring.
    const after = plan([day('2026-11-21', task({ startMin: parseClock('17:42') }))])
    expect(after[0].fireAt).toBe(at('2026-11-21', '17:27'))
  })

  it('treats a two-day Yom Tov as one window', () => {
    const rests = restWindowsFromCalendar([
      { date: '2026-11-17', candleLighting: '4:30 PM' },
      { date: '2026-11-18', candleLighting: '5:20 PM' },
      { date: '2026-11-19', havdalah: '5:25 PM' },
    ])
    // Wednesday 11:00: inside the Yom Tov that began Tuesday evening.
    const r = plan([day('2026-11-18', task({ startMin: 11 * 60 }))], { rests })
    expect(r[0].fireAt).toBe(at('2026-11-17', '16:00'))
  })

  it('drops a shifted reminder that is already past', () => {
    const rest: RestWindow = {
      startDate: '2026-11-16',
      startMin: 12 * 60 + 15,
      endDate: '2026-11-17',
      endMin: 18 * 60,
    }
    expect(plan([day('2026-11-17', task({ startMin: 10 * 60 }))], { rests: [rest] })).toEqual([])
  })

  it('links to the recipe when the task has one', () => {
    const r = plan([day('2026-11-18', task({ recipeId: 'rec1' }))])
    expect(r[0].url).toBe('/recipes/rec1')
  })

  it('puts wait info in the body', () => {
    const same = plan([day('2026-11-18', task({ endMin: parseClock('13:00') }))])
    expect(same[0].body).toBe('For Friday night dinner · Ready by 1:00 PM')
    const later = plan([day('2026-11-18', task({ endMin: 8 * 60, endDate: '2026-11-19' }))])
    expect(later[0].body).toBe('For Friday night dinner · Ready Thursday 8:00 AM')
  })

  it('falls back to the display time when there is no machine time', () => {
    const r = plan([day('2026-11-18', task({ startMin: undefined, time: '9:00 AM' }))])
    expect(r[0].fireAt).toBe(at('2026-11-18', '08:45'))
  })

  it('caps the count, keeping the soonest', () => {
    const tasks = Array.from({ length: 60 }, (_, i) => task({ id: `n${i}`, startMin: 8 * 60 + i }))
    const r = plan([day('2026-11-18', ...tasks)])
    expect(r).toHaveLength(MAX_REMINDERS)
    expect(r[0].id).toBe('prep:2026-11-18:n0')
    expect(r.at(-1)?.id).toBe('prep:2026-11-18:n39')
  })
})

describe('restWindowsFromCalendar', () => {
  it('pairs candle lighting with the next havdalah', () => {
    const w = restWindowsFromCalendar([
      { date: '2026-11-19' },
      { date: '2026-11-20', candleLighting: '4:28 PM' },
      { date: '2026-11-21', havdalah: '5:27 PM' },
    ])
    expect(w).toEqual([
      {
        startDate: '2026-11-20',
        startMin: 16 * 60 + 28,
        endDate: '2026-11-21',
        endMin: 17 * 60 + 27,
      },
    ])
  })
})
