/**
 * Prep reminders: which notifications to schedule for a prep schedule. Pure and deterministic, with
 * no React Native or Expo imports, so it is unit-tested. Times are the household's; the output is
 * real instants (epoch ms).
 */

export type LeadMinutes = 0 | 15 | 30 | 60
export const LEAD_OPTIONS: LeadMinutes[] = [0, 15, 30, 60]

export interface ReminderSettings {
  /** Thaw, marinate, soak, rise: passive and setup tasks. */
  prePrep: boolean
  /** "Start the kugel": active cooking tasks. */
  cooking: boolean
  lead: LeadMinutes
}

export const DEFAULT_SETTINGS: ReminderSettings = { prePrep: true, cooking: false, lead: 15 }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
/** `2026-11-19` → `Thursday`. */
function weekdayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
/** `16:28` → `4:28 PM`. */
function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** How far ahead to schedule, and how many (iOS keeps at most 64 pending per app). */
export const HORIZON_DAYS = 7
export const MAX_REMINDERS = 40
/** Without a known end of hands-on cooking, reminders land this long before candle lighting. */
export const BEFORE_CANDLES_MINUTES = 30

export interface ReminderTask {
  id: string
  kind?: 'active' | 'passive' | 'setup'
  passive?: boolean
  /** Minutes since midnight on the day. Falls back to parsing the display `time`. */
  startMin?: number
  time?: string
  text: string
  mealName: string
  recipeId?: string
  endMin?: number
  endDate?: string
  done?: boolean
}

export interface ReminderDay {
  date: string
  tasks: ReminderTask[]
}

/** Shabbat or Yom Tov, as the household's local dates and minutes since midnight. */
export interface RestWindow {
  startDate: string
  startMin: number
  endDate: string
  endMin: number
  /** Minutes on `startDate` when hands-on cooking ends. Unknown: use the candle-lighting fallback. */
  handsOnEndsMin?: number
}

export interface Reminder {
  id: string
  fireAt: number
  title: string
  body: string
  url: string
}

/** Every identifier of ours starts with this, so cooking-timer notifications are never touched. */
export const REMINDER_ID_PREFIX = 'prep:'

// ---- Time zones ----

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Offset of `tz` from UTC at that instant, in ms. */
function offsetMs(utcMs: number, tz: string): number {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(tz, f)
  }
  const p: Record<string, number> = {}
  for (const part of f.formatToParts(new Date(utcMs)))
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return local - Math.floor(utcMs / 1000) * 1000
}

/** The instant at `minutes` past midnight on `date` in `tz`. Minutes may run past 24 h. */
export function zonedEpoch(date: string, minutes: number, tz: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const naive = Date.UTC(y, m - 1, d, 0, minutes)
  const first = naive - offsetMs(naive, tz)
  return naive - offsetMs(first, tz)
}

/** "4:28 PM" or "16:28" as minutes since midnight. */
export function parseClock(text: string | undefined): number | undefined {
  if (!text) return undefined
  const m = /^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i.exec(text.trim())
  if (!m) return undefined
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return h * 60 + min
}

// ---- Rest windows from the calendar ----

export interface CalendarRestDay {
  date: string
  /** "4:28 PM", on the evening a rest day begins. */
  candleLighting?: string
  /** "5:48 PM", on the day it ends. */
  havdalah?: string
}

/**
 * Shabbat and Yom Tov windows from calendar days: candle lighting until the next havdalah. Windows
 * that overlap (a two-day Yom Tov into Shabbat) are merged when the reminders are placed.
 */
export function restWindowsFromCalendar(days: CalendarRestDay[]): RestWindow[] {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1))
  const out: RestWindow[] = []
  for (const day of sorted) {
    const start = parseClock(day.candleLighting)
    if (start === undefined) continue
    const end = sorted.find((d) => d.date > day.date && parseClock(d.havdalah) !== undefined)
    // Past the end of what we know: assume it lasts to the end of the last day we have.
    out.push({
      startDate: day.date,
      startMin: start,
      endDate: end?.date ?? sorted[sorted.length - 1].date,
      endMin: end ? (parseClock(end.havdalah) as number) : 24 * 60,
    })
  }
  return out
}

interface Span {
  start: number
  end: number
  /** Where a reminder from inside the span goes instead: before hands-on cooking ends. */
  landing: number
}

function restSpans(windows: RestWindow[], tz: string): Span[] {
  const spans = windows
    .map((w) => {
      const start = zonedEpoch(w.startDate, w.startMin, tz)
      return {
        start,
        end: zonedEpoch(w.endDate, w.endMin, tz),
        landing:
          w.handsOnEndsMin !== undefined
            ? zonedEpoch(w.startDate, w.handsOnEndsMin, tz)
            : start - BEFORE_CANDLES_MINUTES * 60_000,
      }
    })
    .sort((a, b) => a.start - b.start)
  const merged: Span[] = []
  for (const s of spans) {
    const last = merged[merged.length - 1]
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end)
    else merged.push({ ...s })
  }
  return merged
}

// ---- The plan ----

const clockText = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}

function waitText(task: ReminderTask, date: string): string {
  if (task.endMin === undefined) return ''
  const at = clock12(clockText(task.endMin))
  if (task.endDate && task.endDate !== date) return `Ready ${weekdayName(task.endDate)} ${at}`
  return `Ready by ${at}`
}

export interface PlanInput {
  days: ReminderDay[]
  rests: RestWindow[]
  settings: ReminderSettings
  /** The household's IANA time zone. */
  timeZone: string
  now: number
  horizonDays?: number
  max?: number
}

/** The reminders to have scheduled, soonest first. */
export function planReminders(input: PlanInput): Reminder[] {
  const { settings, timeZone: tz, now } = input
  if (!settings.prePrep && !settings.cooking) return []
  const horizon = now + (input.horizonDays ?? HORIZON_DAYS) * 86_400_000
  const spans = restSpans(input.rests, tz)
  const out: Reminder[] = []
  for (const day of input.days) {
    for (const t of day.tasks) {
      if (t.done) continue
      const kind = t.kind ?? (t.passive ? 'passive' : 'active')
      if (!(kind === 'active' ? settings.cooking : settings.prePrep)) continue
      const start = t.startMin ?? parseClock(t.time)
      if (start === undefined) continue
      let fireAt = zonedEpoch(day.date, start, tz) - settings.lead * 60_000
      const inside = spans.find((s) => s.start <= fireAt && fireAt < s.end)
      if (inside) fireAt = inside.landing
      if (fireAt <= now || fireAt > horizon) continue
      const body = [t.mealName ? `For ${t.mealName}` : '', waitText(t, day.date)]
        .filter(Boolean)
        .join(' · ')
      out.push({
        id: `${REMINDER_ID_PREFIX}${day.date}:${t.id}`,
        fireAt,
        title: t.text,
        body,
        url: t.recipeId ? `/recipes/${t.recipeId}` : '/prep',
      })
    }
  }
  out.sort((a, b) => a.fireAt - b.fireAt || (a.id < b.id ? -1 : 1))
  return out.slice(0, input.max ?? MAX_REMINDERS)
}
