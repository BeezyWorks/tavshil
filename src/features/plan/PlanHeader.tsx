import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Text, useLayout } from '@/components'
import type { ISODate } from '@/lib/api/types'
import { addDays, dayNum, monthName, toDate } from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { colors, fonts, space } from '@/theme/tokens'

import { usePlanCtx } from './PlanContext'

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

export type HeaderProps = {
  view: 'week' | 'month'
  kicker?: string
  title: string
  /** First day of the week on screen, or any day of the month. */
  week?: ISODate
  today?: ISODate
  /** The week (month) on screen holds today; otherwise a way back is shown. */
  current?: boolean
}

/**
 * The kicker (`Monday · 6 Kislev · week of Vayetzei`), the title (`This week`, or the month), and
 * `‹ Week | Month ›`. On a phone the way back to this week sits on the kicker line and the title shrinks to fit, so
 * the controls always stay on screen.
 */
export function PlanHeader({
  view,
  kicker,
  title,
  week,
  today,
  current = true,
  go,
}: HeaderProps & { go: Go }) {
  const { phone } = useLayout()
  const unit = view === 'week' ? 'week' : 'month'
  const shift = (n: number) => {
    if (!week) return
    if (view === 'week') return go({ week: addDays(week, 7 * n) })
    const d = toDate(week)
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 12))
    go({ week: t.toISOString().slice(0, 10), view: 'month' })
  }
  const { day, selectDay } = usePlanCtx()
  // One way back to now: today's week (or month), with today beside it.
  const away = !current || (!!today && day !== today)
  const back = !away ? null : (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        go(view === 'month' ? { view: 'month' } : {})
        if (today) selectDay(today)
      }}
      style={phone ? styles.backPhone : styles.today}
    >
      <Text
        style={{ fontFamily: fonts.bodySemiBold, fontSize: phone ? 14 : 13 }}
        color={colors.accent}
      >
        {PLAN.today}
      </Text>
    </Pressable>
  )
  return (
    <View style={styles.head}>
      <View style={styles.kickerRow}>
        <Text
          style={{ fontSize: phone ? 14 : 15, flexShrink: 1 }}
          color={colors.muted}
          numberOfLines={1}
        >
          {kicker ?? ' '}
        </Text>
        {phone ? back : null}
      </View>
      <View style={styles.row}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.title, { fontSize: phone ? 28 : 32, lineHeight: phone ? 32 : 38 }]}
        >
          {title}
        </Text>
        <View style={styles.controls}>
          {phone ? null : back}
          <Round label="‹" a11y={`Previous ${unit}`} onPress={() => shift(-1)} small={phone} />
          <Toggle
            view={view}
            phone={phone}
            onPick={(v) => go({ week: current ? undefined : (week ?? today), view: v })}
          />
          <Round label="›" a11y={`Next ${unit}`} onPress={() => shift(1)} small={phone} />
        </View>
      </View>
    </View>
  )
}

/** Week | Month, with the white thumb sliding to the picked side. */
function Toggle({
  view,
  phone,
  onPick,
}: {
  view: 'week' | 'month'
  phone: boolean
  onPick: (v: 'week' | 'month') => void
}) {
  const reduce = useReducedMotion()
  const [slots, setSlots] = useState<Partial<Record<'week' | 'month', { x: number; w: number }>>>(
    {},
  )
  const x = useSharedValue(0)
  const w = useSharedValue(0)
  const at = slots[view]
  useEffect(() => {
    if (!at) return
    const first = w.value === 0
    const cfg = { duration: first || reduce ? 0 : 320, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }
    x.value = withTiming(at.x, cfg)
    w.value = withTiming(at.w, cfg)
  }, [at, reduce, x, w])
  const thumb = useAnimatedStyle(() => ({
    left: x.value,
    width: w.value,
    opacity: w.value ? 1 : 0,
  }))
  return (
    <View accessibilityRole="radiogroup" style={styles.toggle}>
      <Animated.View style={[styles.thumb, thumb]} />
      {(['week', 'month'] as const).map((v) => (
        <Pressable
          key={v}
          accessibilityRole="radio"
          accessibilityState={{ selected: view === v }}
          onPress={() => view !== v && onPick(v)}
          onLayout={(e) => {
            const { x: lx, width } = e.nativeEvent.layout
            setSlots((s) =>
              s[v]?.x === lx && s[v]?.w === width ? s : { ...s, [v]: { x: lx, w: width } },
            )
          }}
          style={[styles.opt, phone && styles.optPhone]}
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
      style={[styles.round, small && styles.roundSmall]}
    >
      <Text style={{ fontSize: 20, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 20 },
  title: { fontFamily: fonts.display, color: colors.ink, flexShrink: 1, marginRight: 'auto' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.wash,
    borderRadius: 999,
    padding: 3,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  opt: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  optPhone: { paddingHorizontal: 9 },
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
  backPhone: { marginLeft: 'auto', minHeight: 28, justifyContent: 'center' },
})
