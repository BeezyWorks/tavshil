import { useRouter, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text, useLayout } from '@/components'
import { Icon } from '@/components/Icon'
import { usePrep, useWeek } from '@/lib/api/hooks'
import type { PlanView } from '@/lib/api/types'
import { clock12 } from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { colors, fonts, radius, space } from '@/theme/tokens'

import { clockShort, dishSummary, mainDish, startTime, tonightOf } from './model'
import { usePlanCtx } from './PlanContext'
import { ProblemLine } from './Slots'

/**
 * The card at the top of the page: tonight's dinner, when to start, and a Cook button. It reads this week itself, so
 * it stays on tonight while the week or month on screen is paged.
 */
export function TonightCard() {
  const q = useWeek()
  if (!q.data) return null
  return <Tonight view={q.data} />
}

function Tonight({ view }: { view: PlanView }) {
  const router = useRouter()
  const { phone } = useLayout()
  const { openMeal, addMeal, openEve } = usePlanCtx()
  const prep = usePrep()
  const tonight = tonightOf(view.days, view.today)

  if (tonight.kind === 'none')
    return (
      <Shell phone={phone} onPress={() => addMeal(view.today, 'dinner')} label={PLAN.addDinner}>
        <Text style={styles.kicker}>{PLAN.tonight}</Text>
        <Text style={styles.addTitle}>{PLAN.addDinner}</Text>
        {phone ? <Text style={styles.sub}>{PLAN.addDinnerHint}</Text> : null}
      </Shell>
    )

  if (tonight.kind === 'eve')
    return (
      <Shell
        phone={phone}
        onPress={() => openEve(tonight.eve)}
        label={`Plan ${tonight.eve.mealName}`}
      >
        <Text style={styles.kicker}>{`${PLAN.tonight} · ${tonight.eve.holyDayLabel}`}</Text>
        <Text style={styles.title}>{tonight.eve.mealName}</Text>
        <Text style={styles.sub}>Not planned yet</Text>
      </Shell>
    )

  const meal = tonight.meal
  const main = mainDish(meal)
  const { lead } = dishSummary(meal)
  const start = meal.id ? startTime(prep.data ?? [], meal.id, view.today) : null
  const people = meal.headcount.total
    ? meal.hosted
      ? `${meal.headcount.total} people`
      : `${meal.headcount.total} of us`
    : ''
  const sub = [start ? `Start at ${clockShort(start)}` : '', people].filter(Boolean).join(' · ')
  const time = meal.timeText ? ` · ${clockShort(clock12(meal.timeText))}` : ''
  return (
    <Shell
      phone={phone}
      onPress={() => openMeal(meal)}
      label={`${PLAN.tonight}: ${lead || meal.name}`}
      action={
        main?.versionId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cook ${main.title}`}
            onPress={() => router.push(`/cook/${main.versionId}` as Href)}
            style={styles.cook}
          >
            <Icon name="play" size={12} color={colors.onAccent} />
            <Text style={styles.cookText}>{PLAN.cook}</Text>
          </Pressable>
        ) : null
      }
    >
      <Text style={styles.kicker}>{`${PLAN.tonight}${time}`}</Text>
      <View style={!phone ? styles.titleRow : undefined}>
        <Text style={styles.title} numberOfLines={2}>
          {lead || meal.name}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <ProblemLine allergies={meal.problems.allergies} gaps={meal.problems.gaps} />
    </Shell>
  )
}

function Shell({
  onPress,
  label,
  children,
  action,
  phone,
}: {
  onPress: () => void
  label: string
  children: React.ReactNode
  action?: React.ReactNode
  phone: boolean
}) {
  return (
    <View style={[styles.card, !phone && styles.cardWide]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.main, !phone && styles.mainWide]}
      >
        {children}
      </Pressable>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    paddingVertical: space.lg,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  cardWide: { paddingHorizontal: 20, gap: space.lg },
  main: { flex: 1, gap: 3, minWidth: 0 },
  mainWide: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  kicker: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent, minWidth: 96 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.ink },
  addTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, flexShrink: 1 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  cook: {
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onAccent },
})
