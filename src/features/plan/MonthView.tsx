import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Card, Loading, Text, useLayout } from '@/components'
import { usePlan, useToday } from '@/lib/api/hooks'
import type { ISODate, RunSummary, WeekDay } from '@/lib/api/types'
import {
  dayNum,
  hebrewDate,
  hebrewDayMonth,
  monthGrid,
  monthName,
  toDate,
  weekdayName,
} from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { colors, fonts, radius, space } from '@/theme/tokens'

import { hebrewMonthsLabel, holyMeals } from './model'
import { usePlanCtx } from './PlanContext'
import { PlanHeader, type Go } from './PlanHeader'
import { PhoneMeal } from './Slots'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'שבת']
const WEEKDAYS_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'שבת']

/** The month as a Calendar-style grid (a dot per meal); tapping a day lists its meals below. */
export function MonthView({ anchor, go }: { anchor?: ISODate; go: Go }) {
  const today = useToday()
  const base = anchor ?? today
  if (!base || !today) return <Loading />
  return <Month base={base} today={today} go={go} />
}

function Month({ base, today, go }: { base: ISODate; today: ISODate; go: Go }) {
  const { phone } = useLayout()
  const d = toDate(base)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const grid = useMemo(() => monthGrid(y, m), [y, m])
  // Five rows are enough when the sixth is all next month.
  const rows = toDate(grid[35]).getUTCMonth() === m ? 6 : 5
  const days = grid.slice(0, rows * 7)
  const q = usePlan(grid[0], grid[grid.length - 1])
  const runs = q.data?.runs ?? []
  const byDate = new Map((q.data?.days ?? []).map((x) => [x.date, x]))
  const inThisMonth = toDate(today).getUTCFullYear() === y && toDate(today).getUTCMonth() === m
  const [picked, setPicked] = useState<ISODate | null>(null)
  const sel =
    picked && days.includes(picked) && toDate(picked).getUTCMonth() === m
      ? picked
      : inThisMonth
        ? today
        : grid.find((x) => toDate(x).getUTCMonth() === m)!
  const monthDays = days.filter((x) => toDate(x).getUTCMonth() === m)
  const title = `${monthName(m)}${y !== toDate(today).getUTCFullYear() ? ` ${y}` : ''}`
  return (
    <View style={styles.page}>
      <PlanHeader
        view="month"
        kicker={hebrewMonthsLabel(monthDays[0], monthDays[monthDays.length - 1])}
        title={title}
        week={base}
        today={today}
        current={inThisMonth}
        go={go}
      />
      {q.error ? (
        <Card tone="danger">
          <Text color={colors.danger}>{(q.error as Error).message}</Text>
        </Card>
      ) : null}
      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {(phone ? WEEKDAYS : WEEKDAYS_LONG).map((w, i) => (
            <Text
              key={`${w}${i}`}
              style={[styles.weekday, i === 6 && { color: colors.info }]}
              align="center"
            >
              {w}
            </Text>
          ))}
        </View>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.weekRow}>
            {days.slice(r * 7, r * 7 + 7).map((date) => (
              <DayBox
                key={date}
                date={date}
                day={byDate.get(date)}
                inMonth={toDate(date).getUTCMonth() === m}
                today={date === today}
                selected={date === sel}
                phone={phone}
                runs={runs}
                onPress={() => setPicked(date)}
              />
            ))}
          </View>
        ))}
      </View>
      {q.isLoading ? (
        <Loading />
      ) : (
        <DayList date={sel} day={byDate.get(sel)} today={today} runs={runs} />
      )}
    </View>
  )
}

function DayBox({
  date,
  day,
  inMonth,
  today,
  selected,
  phone,
  runs,
  onPress,
}: {
  date: ISODate
  runs: RunSummary[]
  day?: WeekDay
  inMonth: boolean
  today: boolean
  selected: boolean
  phone: boolean
  onPress: () => void
}) {
  const holyLabel = day?.holyDay?.label
  const holy = !!day?.holyDay || !!day?.isShabbat || !!day?.isYomTov
  const meals = day ? [...day.meals, ...holyMeals(day, runs)] : []
  const minor = (day?.holidays ?? []).filter((h) => !day?.holyDay || h.kind === 'civil').slice(0, 1)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${weekdayName(date)} ${dayNum(date)}${holyLabel ? `, ${holyLabel}` : ''}${meals.length ? `, ${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}` : ''}`}
      onPress={onPress}
      style={[
        styles.cell,
        phone ? styles.cellPhone : styles.cellWide,
        holy && { backgroundColor: colors.holyTint },
        !inMonth && { opacity: 0.4 },
      ]}
    >
      <View
        style={[
          styles.num,
          today && { backgroundColor: colors.accent },
          selected && !today && { backgroundColor: colors.accentTint },
        ]}
      >
        <Text
          style={{
            fontFamily: today || selected ? fonts.bodySemiBold : fonts.body,
            fontSize: 15,
            color: today ? colors.onAccent : holy ? colors.info : colors.ink,
          }}
        >
          {dayNum(date)}
        </Text>
      </View>
      <Text style={styles.heb} numberOfLines={1}>
        {inMonth || !phone ? hebrewDayMonth(date).split(' ')[0] : ''}
      </Text>
      <View style={styles.dots}>
        {meals.slice(0, 4).map((x, i) => (
          <View
            key={`${x.id ?? x.name}${i}`}
            style={[
              styles.dot,
              { backgroundColor: x.hosted || holy ? colors.info : colors.accent },
            ]}
          />
        ))}
        {minor.length ? <View style={[styles.dot, styles.dotMinor]} /> : null}
      </View>
      {!phone && (minor.length || holyLabel) ? (
        <Text style={styles.small} numberOfLines={1}>
          {minor[0]?.name ?? holyLabel}
        </Text>
      ) : null}
    </Pressable>
  )
}

/** `MONDAY 16 · 6 KISLEV · TODAY` over that day's meals. */
function DayList({
  date,
  day,
  today,
  runs,
}: {
  date: ISODate
  day?: WeekDay
  today: ISODate
  runs: RunSummary[]
}) {
  const { addMeal, openEve } = usePlanCtx()
  const meals = day ? [...day.meals, ...holyMeals(day, runs)] : []
  const head = [
    `${weekdayName(date)} ${dayNum(date)}`,
    hebrewDate(date),
    date === today ? 'Today' : '',
    ...(day?.holidays ?? []).slice(0, 2).map((h) => h.name),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.listHead} accessibilityRole="header">
        {head.toUpperCase()}
      </Text>
      <View style={styles.group}>
        {meals.map((m) => (
          <React.Fragment key={m.id ?? `${m.date}-${m.slot}`}>
            <View style={styles.row}>
              <PhoneMeal meal={m} slotWidth={80} />
            </View>
            <View style={styles.hair} />
          </React.Fragment>
        ))}
        {day?.eve ? (
          <>
            <Pressable
              style={styles.row}
              accessibilityRole="link"
              onPress={() => openEve(day.eve!)}
            >
              <Text style={styles.addText}>{`${day.eve.mealName} →`}</Text>
            </Pressable>
            <View style={styles.hair} />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => addMeal(date, day?.holyDay ? 'lunch' : 'dinner')}
          style={styles.row}
        >
          <Text style={styles.addText}>{`+ ${PLAN.add} a meal`}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.lg },
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    gap: 2,
    overflow: 'hidden',
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.muted,
    paddingBottom: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    borderRadius: 10,
    minWidth: 0,
    paddingVertical: 3,
  },
  cellPhone: { minHeight: 58 },
  cellWide: { minHeight: 84, paddingHorizontal: 4 },
  num: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heb: { fontFamily: fonts.body, fontSize: 9, lineHeight: 11, color: colors.muted },
  dots: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotMinor: { backgroundColor: colors.line },
  small: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  listHead: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.muted,
    paddingLeft: space.lg,
  },
  group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  row: {
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  hair: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: space.lg,
  },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.accent },
})
