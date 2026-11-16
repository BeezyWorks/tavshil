import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Card, Loading, Text, useLayout } from '@/components'
import { usePrep, useWeek } from '@/lib/api/hooks'
import type { ISODate, MealCard, PlanView, PrepDay, RunSummary, WeekDay } from '@/lib/api/types'
import { clockMinutes, dayNum, weekdayName } from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { colors, fonts, radius, space } from '@/theme/tokens'

import {
  buildSegments,
  clockShort,
  headerKicker,
  holyMeals,
  isThisWeek,
  prepNote,
  runMealLabels,
  type Segment,
} from './model'
import { usePlanCtx } from './PlanContext'
import { PlanHeader, rangeLabel, type Go } from './PlanHeader'
import { ColumnMeal, PhoneMeal } from './Slots'
import { TonightCard } from './TonightCard'

/** The Plan tab's week: header, tonight card, then the days (a grouped list on phones, seven columns when wide). */
export function WeekView({ week, go }: { week?: ISODate; go: Go }) {
  const { wide } = useLayout()
  const q = useWeek(week)
  const view = q.data
  const prep = usePrep()
  return (
    <View style={styles.page}>
      <PlanHeader
        view="week"
        kicker={view ? headerKicker(view) : undefined}
        title={
          view
            ? isThisWeek(view)
              ? PLAN.thisWeek
              : rangeLabel(view.from, view.to, view.today)
            : ''
        }
        week={view?.from}
        today={view?.today}
        current={view ? isThisWeek(view) : true}
        go={go}
      />
      {q.error ? (
        <Card tone="danger">
          <Text color={colors.danger}>{(q.error as Error).message}</Text>
        </Card>
      ) : !view ? (
        <Loading />
      ) : (
        <>
          <TonightCard view={view} />
          {wide ? (
            <WideWeek view={view} prep={prep.data ?? []} />
          ) : (
            <PhoneWeek view={view} prep={prep.data ?? []} />
          )}
        </>
      )}
    </View>
  )
}

// ---- Phone ----

function PhoneWeek({ view, prep }: { view: PlanView; prep: PrepDay[] }) {
  const segs = useMemo(() => buildSegments(view.days, view.runs), [view])
  const labels = useMemo(() => runMealLabels(view.runs), [view.runs])
  // Consecutive plain days share one white group.
  const blocks: (
    { kind: 'days'; days: WeekDay[] } | { kind: 'run'; seg: Extract<Segment, { kind: 'run' }> }
  )[] = []
  for (const s of segs) {
    if (s.kind === 'run') blocks.push({ kind: 'run', seg: s })
    else {
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'days') last.days.push(s.day)
      else blocks.push({ kind: 'days', days: [s.day] })
    }
  }
  return (
    <View style={styles.phone}>
      {blocks.map((b, i) =>
        b.kind === 'days' ? (
          <View key={i} style={styles.group}>
            {b.days.map((d, j) => (
              <PhoneDay
                key={d.date}
                day={d}
                first={j === 0}
                prep={prep}
                labels={labels}
                view={view}
              />
            ))}
          </View>
        ) : (
          <RunSection key={b.seg.run.key + i} seg={b.seg} view={view} />
        ),
      )}
    </View>
  )
}

function PhoneDay({
  day,
  first,
  prep,
  labels,
  view,
}: {
  day: WeekDay
  first: boolean
  prep: PrepDay[]
  labels: Map<string, string>
  view: PlanView
}) {
  const { addMeal } = usePlanCtx()
  const tasks = prep
    .filter((p) => p.date === day.date)
    .flatMap((p) => p.tasks.filter((t) => !t.done))
  const hasDinner = day.meals.some((m) => m.slot === 'dinner')
  const note = prepNote(tasks, labels, true)
  const from =
    day.eve && tasks.length
      ? tasks.map((t) => t.time).sort((a, b) => (clockMinutes(a) ?? 0) - (clockMinutes(b) ?? 0))[0]
      : ''
  const today = day.date === view.today
  return (
    <>
      {first ? null : <View style={styles.hair} />}
      <View style={[styles.dayRow, today && { backgroundColor: colors.todayTint }]}>
        <View style={styles.date}>
          <Text style={styles.dow}>{weekdayName(day.date, true)}</Text>
          <Text style={[styles.num, today && { color: colors.accent }]}>{dayNum(day.date)}</Text>
        </View>
        <View style={styles.meals}>
          {day.meals.map((m) => (
            <PhoneMeal key={m.id ?? m.name} meal={m} />
          ))}
          {hasDinner || day.eve ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add dinner on ${weekdayName(day.date)}`}
              onPress={() => addMeal(day.date, 'dinner')}
              style={styles.addRow}
            >
              <Text style={styles.slotMuted}>Dinner</Text>
              <Text style={styles.addText}>{PLAN.add}</Text>
            </Pressable>
          )}
          {day.eve && day.candleLighting ? (
            <Text style={styles.note}>{`Candles ${day.candleLighting.text}`}</Text>
          ) : null}
          {day.holidays.slice(0, 2).map((h) => (
            <Text key={h.name} style={styles.note}>
              {h.name}
            </Text>
          ))}
          {note ? (
            <Text style={styles.note}>{from ? `${note} from ${clockShort(from)}` : note}</Text>
          ) : null}
        </View>
        <PlusButton date={day.date} />
      </View>
    </>
  )
}

function PlusButton({ date, slot }: { date: ISODate; slot?: MealCard['slot'] }) {
  const { addMeal } = usePlanCtx()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add a meal on ${weekdayName(date)} ${dayNum(date)}`}
      onPress={() => addMeal(date, slot)}
      style={styles.plus}
    >
      <Text style={styles.plusText}>+</Text>
    </Pressable>
  )
}

/** `SHABBAT · CANDLES FRI 4:16` over a group of that holy day's meals. */
function RunSection({ seg, view }: { seg: Extract<Segment, { kind: 'run' }>; view: PlanView }) {
  const dates = new Set(seg.days.map((d) => d.date))
  const cols = seg.run.holyDays.filter((h) => dates.has(h.date))
  const eve = view.days.find((d) => d.eve?.runKey === seg.run.key && d.candleLighting)
  const head = [
    seg.run.title,
    eve ? `candles ${weekdayName(eve.date, true)} ${eve.candleLighting!.text}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {head.toUpperCase()}
      </Text>
      <View style={styles.group}>
        {cols.map((h, i) => (
          <React.Fragment key={h.date}>
            {i ? <View style={styles.hair} /> : null}
            <View style={styles.runDay}>
              {cols.length > 1 ? <Text style={styles.runLabel}>{h.label}</Text> : null}
              {h.meals.map((m) => (
                <PhoneMeal key={m.id ?? `${m.date}-${m.slot}`} meal={m} slotWidth={88} people />
              ))}
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  )
}

// ---- Wide ----

function WideWeek({ view, prep }: { view: PlanView; prep: PrepDay[] }) {
  const labels = useMemo(() => runMealLabels(view.runs), [view.runs])
  return (
    <View style={styles.grid}>
      {view.days.map((d, i) => (
        <Column
          key={d.date}
          day={d}
          last={i === view.days.length - 1}
          view={view}
          prep={prep}
          labels={labels}
        />
      ))}
    </View>
  )
}

function Column({
  day,
  last,
  view,
  prep,
  labels,
}: {
  day: WeekDay
  last: boolean
  view: PlanView
  prep: PrepDay[]
  labels: Map<string, string>
}) {
  const { addMeal, openEve } = usePlanCtx()
  const today = day.date === view.today
  const holy = !!day.holyDay
  const meals = holy ? holyMeals(day, view.runs) : day.meals
  const tasks = prep
    .filter((p) => p.date === day.date)
    .flatMap((p) => p.tasks.filter((t) => !t.done))
  const note = [
    day.eve && day.candleLighting ? `Candles ${day.candleLighting.text}` : '',
    prepNote(tasks, labels, false),
  ]
    .filter(Boolean)
    .join(' · ')
  const tint = today ? colors.todayTint : holy ? colors.holyTint : undefined
  const accent = today ? colors.accent : holy ? colors.info : undefined
  return (
    <View
      accessibilityLabel={`${weekdayName(day.date)} ${dayNum(day.date)}`}
      style={[styles.column, !last && styles.columnRule, tint && { backgroundColor: tint }]}
    >
      <View>
        <Text
          style={[styles.colLabel, accent && { color: accent, fontFamily: fonts.bodySemiBold }]}
        >
          {today ? 'Today' : holy ? day.holyDay!.label : weekdayName(day.date, true)}
        </Text>
        <Text style={[styles.colNum, accent && { color: accent }]}>{dayNum(day.date)}</Text>
      </View>
      {meals.map((m) => (
        <ColumnMeal key={m.id ?? `${m.date}-${m.slot}`} meal={m} />
      ))}
      {day.eve && !holy ? (
        <Pressable accessibilityRole="link" onPress={() => openEve(day.eve!)} style={{ gap: 1 }}>
          <Text style={styles.eveText}>{`${day.eve.mealName} →`}</Text>
        </Pressable>
      ) : null}
      {day.holidays.slice(0, 2).map((h) => (
        <Text
          key={h.name}
          style={[styles.colNote, h.kind === 'civil' && { fontStyle: 'italic' }]}
          numberOfLines={1}
        >
          {h.name}
        </Text>
      ))}
      {note ? <Text style={styles.colNote}>{note}</Text> : null}
      <View style={{ flexGrow: 1 }} />
      {day.eve ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add a meal on ${weekdayName(day.date)} ${dayNum(day.date)}`}
          onPress={() => addMeal(day.date, holy ? 'lunch' : 'dinner')}
          style={styles.addMeal}
        >
          <Text style={styles.addMealText}>{PLAN.addMeal}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.lg },
  phone: { gap: space.sm },
  group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 66 },
  dayRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: space.lg,
    paddingRight: 6,
  },
  date: { width: 36 },
  dow: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  num: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.ink },
  meals: { flex: 1, gap: 6, minWidth: 0 },
  addRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 28 },
  slotMuted: { width: 52, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.accent },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  plus: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  plusText: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: colors.accent },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.info,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
  },
  runDay: { paddingVertical: 12, paddingHorizontal: space.lg, gap: 8 },
  runLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.info },
  grid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    overflow: 'hidden',
    minHeight: 360,
  },
  column: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 12, gap: 12 },
  columnRule: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.separator },
  colLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  colNum: { fontFamily: fonts.bodySemiBold, fontSize: 20, color: colors.ink },
  colNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  eveText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
  addMeal: { minHeight: 32, justifyContent: 'center' },
  addMealText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
})
