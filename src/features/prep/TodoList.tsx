import { type Href } from 'expo-router'
import { useTabRouter } from '@/lib/tabRoute'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Checkbox, Empty, Loading, Pill, Text } from '@/components'
import { useSetPrepDone, usePrep, useToday } from '@/lib/api/hooks'
import type { PrepDay, PrepTask } from '@/lib/api/types'
import { storage } from '@/lib/storage'
import { PREP } from '@/lib/strings'
import { colors, fontSize, fonts, radius, space } from '@/theme/tokens'

import { taskRecipeHref } from '../plan/PlanContext'
import {
  dayShort,
  filterPrep,
  lowerTime,
  prepMeals,
  progressText,
  restBlock,
  validSelection,
  type PrepMeal,
} from './model'

const KEY = 'tavshil.prep.meals'

/** The meals picked on this device; none means everything. */
function useSelection(): [string[], (next: string[]) => void] {
  const [sel, setSel] = useState<string[]>(() => {
    try {
      const v = JSON.parse(storage.get(KEY) ?? '[]')
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
    } catch {
      return []
    }
  })
  const set = useCallback((next: string[]) => {
    setSel(next)
    storage.set(KEY, next.length ? JSON.stringify(next) : null)
  }, [])
  return [sel, set]
}

/**
 * Plan's "To do" on a phone: the prep tasks by the day they are done, from today on. Chips narrow it to some
 * meals (`meal` picks one on arrival, from a meal's "All prep" link).
 */
export function TodoList({ meal }: { meal?: string }) {
  const { data, isLoading } = usePrep()
  const today = useToday()
  const [stored, setSelected] = useSelection()
  useEffect(() => {
    if (meal) setSelected([meal])
  }, [meal, setSelected])
  const meals = useMemo(() => prepMeals(data ?? []), [data])
  const selected = useMemo(() => validSelection(stored, meals), [stored, meals])
  const days = useMemo(() => filterPrep(data ?? [], selected), [data, selected])
  const toggle = (id: string) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  if (isLoading || !data) return <Loading />
  if (meals.length === 0 && days.length === 0) return <Empty>{PREP.empty}</Empty>
  return (
    <View style={styles.phone}>
      <View style={styles.chips} accessibilityRole="menu">
        {meals.map((m) => (
          <Pill
            key={m.mealId}
            label={m.name}
            selected={selected.includes(m.mealId)}
            onPress={() => toggle(m.mealId)}
          />
        ))}
      </View>
      {selected.length ? (
        meals
          .filter((m) => selected.includes(m.mealId))
          .map((m) => <MealCard key={m.mealId} meal={m} days={days} today={today} />)
      ) : (
        <Timeline days={days} today={today} />
      )}
    </View>
  )
}

const serveText = (m: PrepMeal) =>
  [m.date ? dayShort(m.date).split(' ')[0] : '', m.time ? lowerTime(m.time) : '']
    .filter(Boolean)
    .join(' · ')

/** Phone, with meals picked: one block per meal, its tasks under day headings. */
function MealCard({ meal, days, today }: { meal: PrepMeal; days: PrepDay[]; today?: string }) {
  const mine = days
    .map((d) => ({ ...d, tasks: d.tasks.filter((t) => t.mealId === meal.mealId) }))
    .filter((d) => d.tasks.length > 0)
  const pct = meal.tasks.length ? (meal.done / meal.tasks.length) * 100 : 0
  return (
    <View style={styles.group}>
      <View style={styles.cardHead}>
        <View style={styles.mealTitle}>
          <Text variant="h2" style={styles.flex}>
            {meal.name}
          </Text>
          <Text variant="small">{serveText(meal)}</Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text variant="small">{progressText(meal, today)}</Text>
      </View>
      {mine.map((d) => (
        <View key={d.id}>
          <DayHeading day={d} today={today} inside />
          {d.tasks.map((t) => (
            <TaskRow key={t.id} task={t} hideMeal />
          ))}
          {d.rest ? <RestLine day={d} /> : null}
        </View>
      ))}
    </View>
  )
}

function DayHeading({ day, today, inside }: { day: PrepDay; today?: string; inside?: boolean }) {
  const isToday = day.date === today
  return (
    <Text
      variant="label"
      accessibilityRole="header"
      color={isToday ? colors.accent : colors.muted}
      style={inside ? styles.insideHeading : styles.heading}
    >
      {isToday ? `Today · ${dayShort(day.date)}` : dayShort(day.date)}
      {day.hebrew ? ` · ${day.hebrew}` : ''}
    </Text>
  )
}

/** Everything by day: a heading and a white group per day, the Shabbat block where it falls. */
function Timeline({ days, today }: { days: PrepDay[]; today?: string }) {
  if (days.length === 0) return <Empty>{PREP.nothing}</Empty>
  return (
    <View style={styles.timeline}>
      {days.map((d) => (
        <View key={d.id} style={styles.day}>
          <DayHeading day={d} today={today} />
          {d.tasks.length ? (
            <View style={styles.group}>
              {d.tasks.map((t, i) => (
                <TaskRow key={t.id} task={t} last={i === d.tasks.length - 1} />
              ))}
            </View>
          ) : null}
          {d.rest ? <RestLine day={d} /> : null}
        </View>
      ))}
    </View>
  )
}

/** The cut-off line before Shabbat or Yom Tov, and the block that follows. */
export function RestLine({ day }: { day: PrepDay }) {
  const r = day.rest
  if (!r) return null
  const b = restBlock(r)
  return (
    <View style={styles.rest}>
      <View style={styles.cutoff}>
        <View style={styles.rule} />
        <Text variant="small" color={colors.info} style={styles.cutoffText}>
          {b.cutoff}
        </Text>
        <View style={styles.rule} />
      </View>
      <View style={styles.restBlock}>
        <Text variant="bodyStrong" color={colors.info}>
          {b.title}
        </Text>
        <Text variant="small" color={colors.info}>
          {b.body}
        </Text>
      </View>
    </View>
  )
}

/** A task: tick, time, what to do, which meal, and a way into the recipe or cooking mode. */
function TaskRow({
  task: t,
  last,
  hideMeal,
}: {
  task: PrepTask
  last?: boolean
  hideMeal?: boolean
}) {
  const router = useTabRouter()
  const set = useSetPrepDone()
  const open = t.recipeId ? () => router.push(taskRecipeHref(t) as Href) : undefined
  const cook =
    t.versionId && t.kind === 'active'
      ? () => router.push(`/cook/${t.versionId}` as Href)
      : undefined
  const sub = [
    hideMeal ? null : t.mealName,
    t.mealTime && !hideMeal ? `served ${lowerTime(t.mealTime)}` : null,
  ].filter(Boolean)
  return (
    <View style={[styles.task, !last && styles.sep]}>
      <Checkbox
        label={`${t.done ? 'Mark not done' : 'Done'}: ${t.text}`}
        checked={t.done}
        onChange={(done) => set.mutate([{ key: t.id, done }])}
      />
      <Text variant="small" style={[styles.time, !t.done && styles.timeOn]}>
        {lowerTime(t.time)}
      </Text>
      <Pressable
        style={styles.flex}
        accessibilityRole={open ? 'link' : undefined}
        accessibilityLabel={open ? `Open recipe: ${t.text}` : undefined}
        disabled={!open}
        onPress={open}
      >
        <Text variant="bodyStrong" style={t.done && styles.done}>
          {t.text}
        </Text>
        {sub.length || t.passive || t.waitUntil || cook ? (
          <View style={styles.subRow}>
            {t.passive || t.waitUntil ? (
              <Text variant="small" color={colors.accent} style={styles.passive}>
                {t.waitUntil
                  ? PREP.sitsUntil(lowerTime(t.waitUntil))
                  : t.endTime
                    ? PREP.sitsUntil(lowerTime(t.endTime))
                    : PREP.passive}
              </Text>
            ) : null}
            {sub.length ? <Text variant="small">{sub.join(' · ')}</Text> : null}
            {cook ? (
              <Pressable onPress={cook} accessibilityRole="link">
                <Text variant="small" color={colors.accent} style={styles.cookText}>
                  {PREP.cook}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {t.guessedTimes ? (
          <Pressable
            style={styles.guess}
            onPress={open}
            disabled={!open}
            accessibilityRole="link"
            accessibilityLabel="Add times to the recipe"
          >
            <Text style={styles.guessText}>{PREP.guessed}</Text>
          </Pressable>
        ) : null}
      </Pressable>
      {open ? (
        <Text color={colors.muted} style={styles.chev} accessibilityElementsHidden>
          {'›'}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chev: { paddingTop: 10, fontSize: fontSize.xl },
  phone: { gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  timeline: { gap: space.lg },
  day: { gap: space.sm },
  heading: { paddingHorizontal: space.xs },
  insideHeading: { paddingHorizontal: space.lg, paddingTop: space.md },
  group: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  mealTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  cardHead: { padding: space.lg, gap: space.sm },
  bar: { height: 5, borderRadius: radius.pill, backgroundColor: colors.subtle, overflow: 'hidden' },
  barFill: { height: 5, backgroundColor: colors.accent },
  task: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.md,
    paddingVertical: space.xs,
  },
  time: { width: 62, paddingTop: 12 },
  timeOn: { color: colors.ink, fontFamily: fonts.bodySemiBold },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  subRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'baseline' },
  passive: { fontFamily: fonts.bodySemiBold },
  guess: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warnSoft,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginTop: 4,
  },
  guessText: { color: colors.warn, fontFamily: fonts.bodySemiBold, fontSize: fontSize.xs },
  cookText: { fontFamily: fonts.bodySemiBold },
  rest: { gap: space.sm, marginTop: space.sm },
  cutoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  rule: { height: 2, flex: 1, backgroundColor: colors.info },
  cutoffText: { fontFamily: fonts.bodySemiBold, flexShrink: 1, textAlign: 'center' },
  restBlock: {
    backgroundColor: colors.infoSoft,
    borderRadius: 10,
    padding: space.md,
    gap: 2,
    marginHorizontal: space.sm,
    marginBottom: space.sm,
  },
})
