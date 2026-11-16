import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text, useLayout } from '@/components'
import type { ISODate } from '@/lib/api/types'
import { addDays, dayNum, monthName, toDate } from '@/lib/dates'
import { colors, fonts, space } from '@/theme/tokens'

/** `8 – 14 November`, with the year when it is not the current one. */
export function rangeLabel(from: ISODate, to: ISODate, today: ISODate): string {
  const a = toDate(from)
  const b = toDate(to)
  const year = b.getUTCFullYear() !== toDate(today).getUTCFullYear() ? ` ${b.getUTCFullYear()}` : ''
  if (a.getUTCMonth() === b.getUTCMonth())
    return `${dayNum(from)} – ${dayNum(to)} ${monthName(b.getUTCMonth())}${year}`
  return `${dayNum(from)} ${monthName(a.getUTCMonth()).slice(0, 3)} – ${dayNum(to)} ${monthName(b.getUTCMonth()).slice(0, 3)}${year}`
}

export type Go = (o: { week?: ISODate; view?: 'week' | 'month' }) => void

/**
 * The kicker (`Monday · 6 Kislev · week of Vayetzei`), the title (`This week`, or the month), previous / next, and the
 * Week | Month toggle.
 */
export function PlanHeader({
  view,
  kicker,
  title,
  week,
  today,
  current = true,
  go,
}: {
  view: 'week' | 'month'
  kicker?: string
  title: string
  /** First day of the week on screen, or any day of the month. */
  week?: ISODate
  today?: ISODate
  /** The week (month) on screen holds today; otherwise a way back is shown. */
  current?: boolean
  go: Go
}) {
  const { phone } = useLayout()
  const unit = view === 'week' ? 'week' : 'month'
  const shift = (n: number) => {
    if (!week) return
    if (view === 'week') return go({ week: addDays(week, 7 * n) })
    const d = toDate(week)
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 12))
    go({ week: t.toISOString().slice(0, 10), view: 'month' })
  }
  return (
    <View style={styles.head}>
      <Text style={{ fontSize: phone ? 14 : 15 }} color={colors.muted}>
        {kicker ?? ' '}
      </Text>
      <View style={styles.row}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { fontSize: phone ? 28 : 32, lineHeight: phone ? 32 : 38 }]}
        >
          {title}
        </Text>
        <View style={styles.controls}>
          {current ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => go(view === 'month' ? { view: 'month' } : {})}
              style={styles.today}
            >
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13 }} color={colors.accent}>
                {view === 'week' ? 'This week' : 'This month'}
              </Text>
            </Pressable>
          )}
          <Round label="‹" a11y={`Previous ${unit}`} onPress={() => shift(-1)} small={phone} />
          <Round label="›" a11y={`Next ${unit}`} onPress={() => shift(1)} small={phone} />
          <View accessibilityRole="radiogroup" style={[styles.toggle, !phone && styles.toggleWide]}>
            {(['week', 'month'] as const).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="radio"
                accessibilityState={{ selected: view === v }}
                onPress={() => view !== v && go({ week: week ?? today, view: v })}
                style={[styles.opt, view === v && styles.optOn]}
              >
                <Text
                  style={{
                    fontFamily: view === v ? fonts.bodySemiBold : fonts.body,
                    fontSize: phone ? 13 : 14,
                  }}
                >
                  {v === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function Round({
  label,
  a11y,
  onPress,
  small,
}: {
  label: string
  a11y: string
  onPress: () => void
  small?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={styles.round}
    >
      <Text style={{ fontSize: 20, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  title: { fontFamily: fonts.display, color: colors.ink, flexShrink: 0, marginRight: 'auto' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.wash,
    borderRadius: 999,
    padding: 3,
  },
  toggleWide: { marginLeft: 6 },
  opt: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  optOn: { backgroundColor: colors.surface },
  round: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.washLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSmall: { width: 30, height: 30 },
  today: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
})
