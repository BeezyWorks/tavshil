import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { Icon } from '@/components/Icon'
import { useHostedMeal } from '@/lib/api/hooks'
import type { HostedMeal, Id } from '@/lib/api/types'
import { hostedHref, recipeInMealHref, safeFrom } from '@/lib/plan'
import { colors, radius, size, space } from '@/theme/tokens'

interface Dish {
  recipeId: Id
  title: string
}

export interface MealContext {
  mealId: Id
  meal?: HostedMeal
  /** The meal's dishes that have a recipe, in menu order, one per recipe. */
  dishes: Dish[]
  /** Where "Back" goes: the page the recipe was opened from, else the meal's hosted page. */
  backHref?: string
}

/** The meal a recipe was opened from (`?meal=<id>&from=<path>`), or null when it was opened on its own. */
export function useMealContext(): MealContext | null {
  const params = useLocalSearchParams<{ meal?: string; from?: string }>()
  const mealId = (params.meal || undefined) as Id | undefined
  const q = useHostedMeal(mealId)
  if (!mealId) return null
  const meal = q.data
  const seen = new Set<string>()
  const dishes: Dish[] = []
  for (const c of meal?.menu ?? [])
    for (const it of c.items)
      if (it.recipeId && !seen.has(it.recipeId)) {
        seen.add(it.recipeId)
        dishes.push({ recipeId: it.recipeId, title: it.title })
      }
  const backHref = safeFrom(params.from) ?? (meal ? hostedHref(meal.hostedKey) : undefined)
  return { mealId, meal, dishes, backHref }
}

/** Steps through the other dishes of the meal the recipe was opened from: previous, "2 of 5", next. */
export function MealBar({ ctx, recipeId }: { ctx: MealContext; recipeId: string }) {
  const router = useRouter()
  const { dishes, meal } = ctx
  const i = dishes.findIndex((d) => d.recipeId === recipeId)
  if (!meal || i < 0 || dishes.length < 2) return null
  const prev = dishes[i - 1]
  const next = dishes[i + 1]
  const go = (d: Dish) =>
    router.replace(
      recipeInMealHref(d.recipeId, ctx.mealId, ctx.backHref ?? hostedHref(meal.hostedKey)) as Href,
    )
  return (
    <View
      style={styles.bar}
      accessibilityRole="toolbar"
      accessibilityLabel={`Dishes in ${meal.name}`}
    >
      <Step dish={prev} dir="back" onPress={go} />
      <View style={styles.middle}>
        <Text variant="label" numberOfLines={1}>
          {meal.name}
        </Text>
        <Text variant="small">{`Dish ${i + 1} of ${dishes.length}`}</Text>
      </View>
      <Step dish={next} dir="forward" onPress={go} />
    </View>
  )
}

function Step({
  dish,
  dir,
  onPress,
}: {
  dish?: Dish
  dir: 'back' | 'forward'
  onPress: (d: Dish) => void
}) {
  if (!dish) return <View style={styles.step} />
  const back = dir === 'back'
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${back ? 'Previous' : 'Next'} dish: ${dish.title}`}
      onPress={() => onPress(dish)}
      style={({ pressed }) => [
        styles.step,
        back ? styles.stepBack : styles.stepNext,
        pressed && { opacity: 0.6 },
      ]}
    >
      {back ? <Icon name="back" size={18} color={colors.accent} /> : null}
      <View style={[styles.stepText, !back && { alignItems: 'flex-end' }]}>
        <Text variant="small">{back ? 'Previous' : 'Next'}</Text>
        <Text color={colors.accent} numberOfLines={1}>
          {dish.title}
        </Text>
      </View>
      {back ? null : <Icon name="forward" size={18} color={colors.accent} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  middle: { alignItems: 'center', flexShrink: 1, paddingHorizontal: space.xs },
  step: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  stepBack: { justifyContent: 'flex-start' },
  stepNext: { justifyContent: 'flex-end' },
  stepText: { flexShrink: 1, minWidth: 0 },
})
