import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import type { MealCard } from '@/lib/api/types'
import { clock12 } from '@/lib/dates'
import { colors, fonts, space } from '@/theme/tokens'

import { clockShort, dishSummary, plural, slotName } from './model'
import { usePlanCtx } from './PlanContext'

/** `1 allergy to check` (danger) and `1 gap` (warn). `short` drops "to check" for tight columns. */
export function ProblemLine({
  allergies,
  gaps,
  short,
}: {
  allergies: number
  gaps: number
  short?: boolean
}) {
  if (!allergies && !gaps) return null
  return (
    <View style={styles.problems}>
      {allergies ? (
        <Text style={[styles.problem, { color: colors.danger }]}>
          {`${plural(allergies, 'allergy', 'allergies')}${short ? '' : ' to check'}`}
        </Text>
      ) : null}
      {gaps ? (
        <Text style={[styles.problem, { color: colors.warn }]}>{plural(gaps, 'gap', 'gaps')}</Text>
      ) : null}
    </View>
  )
}

/** `Dinner 7:00`, `Leil Shabbat` */
export function slotText(meal: MealCard, withTime = true): string {
  const time = withTime && meal.timeText ? ` ${clockShort(clock12(meal.timeText))}` : ''
  return `${slotName(meal)}${time}`
}

/** A meal in the phone list: slot name, the dish (+ how many more), people, problems. */
export function PhoneMeal({
  meal,
  slotWidth = 52,
  onPress,
  people,
}: {
  meal: MealCard
  slotWidth?: number
  /** Overrides opening the meal (run meals open their hosted page). */
  onPress?: () => void
  people?: boolean
}) {
  const { openMeal } = usePlanCtx()
  const { lead, more } = dishSummary(meal)
  const headcount = people && meal.headcount.total ? ` · ${meal.headcount.total} people` : ''
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${slotName(meal)}: ${lead || 'not planned'}${more ? ` and ${more} more` : ''}`}
      onPress={onPress ?? (() => openMeal(meal))}
      style={styles.phoneMeal}
    >
      <Text style={[styles.slot, { width: slotWidth }]} numberOfLines={1}>
        {slotName(meal)}
      </Text>
      <View style={styles.grow}>
        {lead ? (
          <Text style={styles.dish}>
            {lead}
            {more || headcount ? (
              <Text style={styles.more}>{`${more ? ` +${more}` : ''}${headcount}`}</Text>
            ) : null}
          </Text>
        ) : (
          <Text style={[styles.dish, { color: colors.muted, fontFamily: fonts.body }]}>
            {meal.virtual || !meal.planned ? 'Not planned' : meal.name}
          </Text>
        )}
        <ProblemLine allergies={meal.problems.allergies} gaps={meal.problems.gaps} />
      </View>
    </Pressable>
  )
}

/** A meal in a wide day column: slot, dish, `+2 · 1 allergy`. */
export function ColumnMeal({ meal }: { meal: MealCard }) {
  const { openMeal, selected } = usePlanCtx()
  const { lead, more } = dishSummary(meal)
  const on = !!selected?.meal && selected.meal.id === meal.id
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${slotName(meal)}: ${lead || 'not planned'}${more ? ` and ${more} more` : ''}`}
      onPress={() => openMeal(meal)}
      style={[styles.col, on && styles.colOn]}
    >
      <Text style={styles.colSlot} numberOfLines={1}>
        {slotText(meal)}
      </Text>
      <Text
        style={[styles.colDish, !lead && { color: colors.muted, fontFamily: fonts.body }]}
        numberOfLines={3}
      >
        {lead || 'Not planned'}
      </Text>
      {more || meal.problems.allergies || meal.problems.gaps ? (
        <Text style={styles.colMore} numberOfLines={2}>
          {more ? `+${more}` : ''}
          {more && (meal.problems.allergies || meal.problems.gaps) ? ' · ' : ''}
          {meal.problems.allergies ? (
            <Text style={{ color: colors.danger, fontFamily: fonts.bodySemiBold }}>
              {plural(meal.problems.allergies, 'allergy', 'allergies')}
            </Text>
          ) : null}
          {meal.problems.gaps ? (
            <Text style={{ color: colors.warn, fontFamily: fonts.bodySemiBold }}>
              {`${meal.problems.allergies ? ' · ' : ''}${plural(meal.problems.gaps, 'gap', 'gaps')}`}
            </Text>
          ) : null}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  problems: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  problem: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  phoneMeal: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 28 },
  grow: { flex: 1, gap: 2, minWidth: 0 },
  slot: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  dish: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.ink },
  more: { fontFamily: fonts.body, color: colors.muted },
  col: { gap: 1, borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 4, paddingVertical: 2 },
  colOn: { backgroundColor: colors.accentSoft },
  colSlot: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  colDish: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  colMore: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
})
