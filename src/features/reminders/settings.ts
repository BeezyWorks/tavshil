import { useSyncExternalStore } from 'react'

import { storage } from '@/lib/storage'

import { DEFAULT_SETTINGS, LEAD_OPTIONS, type LeadMinutes, type ReminderSettings } from './plan'

/** Per-device prep reminder settings: kept on this phone, not in the household. */
const KEY = 'tavshil.prepReminders'

function load(): ReminderSettings {
  try {
    const raw = storage.get(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const p = JSON.parse(raw) as Partial<ReminderSettings>
    return {
      prePrep: typeof p.prePrep === 'boolean' ? p.prePrep : DEFAULT_SETTINGS.prePrep,
      cooking: typeof p.cooking === 'boolean' ? p.cooking : DEFAULT_SETTINGS.cooking,
      lead: LEAD_OPTIONS.includes(p.lead as LeadMinutes)
        ? (p.lead as LeadMinutes)
        : DEFAULT_SETTINGS.lead,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current = load()
const listeners = new Set<() => void>()

export const getReminderSettings = () => current

export function setReminderSettings(patch: Partial<ReminderSettings>) {
  current = { ...current, ...patch }
  storage.set(KEY, JSON.stringify(current))
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useReminderSettings(): [
  ReminderSettings,
  (patch: Partial<ReminderSettings>) => void,
] {
  const value = useSyncExternalStore(subscribe, getReminderSettings, getReminderSettings)
  return [value, setReminderSettings]
}
