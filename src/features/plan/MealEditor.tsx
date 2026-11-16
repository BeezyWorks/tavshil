import { useRouter, type Href } from 'expo-router'
import React, { useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button, RecipePicker, Text } from '@/components'
import { Icon } from '@/components/Icon'
import {
  useAddMealDish,
  useCreatePlanMeal,
  useDeletePlanMeal,
  useHostedMeal,
  useRemoveMealDish,
} from '@/lib/api/hooks'
import type { DaySlot, Id, ISODate, MealCard, MealDish } from '@/lib/api/types'
import { longDate } from '@/lib/dates'
import { SLOT_LABEL } from '@/lib/plan'
import { colors, fonts, fontSize, radius, size, space } from '@/theme/tokens'

import { Sheet } from './Sheet'

type Mode = 'view' | 'add' | 'edit'

/**
 * A day's everyday meal. A planned meal opens on what is for dinner: its dishes, each with its recipe and cooking
 * mode, straight from the plan card (no loading). Adding and removing dishes are a tap away. An empty slot opens on
 * the recipe search, unfocused. The meal is created on the first dish, so opening an empty slot and closing it again
 * leaves nothing behind.
 */
export function MealEditor({
  date,
  slot,
  meal,
  createdId,
  onClose,
}: {
  date: ISODate
  slot: DaySlot
  meal?: MealCard
  /** A meal made a moment ago by "Add another meal": removed again on close if it got no dish. */
  createdId?: Id
  onClose: () => void
}) {
  const router = useRouter()
  const [mine, setMine] = useState<Id | null>(createdId ?? null)
  const added = useRef(0)
  const mealId = meal?.id ?? mine ?? undefined
  const planned = !!meal?.dishes.length
  const [mode, setMode] = useState<Mode>(planned ? 'view' : 'add')
  // The card already carries the dishes; the full meal is only needed once something changes.
  const touched = useRef(false)
  const hm = useHostedMeal(mealId, mode !== 'view' || touched.current || !meal)
  const create = useCreatePlanMeal()
  const add = useAddMealDish()
  const remove = useRemoveMealDish()
  const del = useDeletePlanMeal()
  const [error, setError] = useState('')

  const ensure = async (): Promise<Id> => {
    if (mealId) return mealId
    const m = await create.mutateAsync({ date, slot })
    const id = m.id as Id
    setMine(id)
    return id
  }
  const run = async (fn: () => Promise<unknown>) => {
    setError('')
    touched.current = true
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const addDish = (dish: { versionId?: Id; description?: string }) =>
    run(async () => {
      const id = await ensure()
      await add.mutateAsync({ mealId: id, dish: { course: 'main', ...dish } })
      added.current += 1
      setMode('view')
    })
  const close = async () => {
    // Remove a meal we made here that stayed empty.
    if (mine && !meal?.id && added.current === 0) {
      const empty = !hm.data || hm.data.menu.every((c) => c.items.length === 0)
      if (empty) await del.mutateAsync(mine).catch(() => undefined)
    }
    onClose()
  }
  const go = (href: string) => {
    onClose()
    router.push(href as Href)
  }

  const dishes: MealDish[] = hm.data
    ? hm.data.menu.flatMap((c) =>
        c.items.map((i) => ({
          itemId: i.itemId,
          title: i.title,
          course: i.course,
          recipeId: i.recipeId,
          versionId: i.versionId,
        })),
      )
    : (meal?.dishes ?? [])
  const title = `${meal?.name ?? SLOT_LABEL[slot]} · ${longDate(date)}`

  return (
    <Sheet title={title} onClose={close}>
      {dishes.length ? (
        <View style={styles.list}>
          {dishes.map((d) => (
            <View key={d.itemId} style={styles.dish}>
              <Text style={styles.dishTitle} numberOfLines={2}>
                {d.title}
              </Text>
              {mode === 'edit' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${d.title}`}
                  onPress={() =>
                    mealId && run(() => remove.mutateAsync({ mealId, itemId: d.itemId }))
                  }
                  style={styles.x}
                >
                  <Icon name="trash" size={18} color={colors.muted} />
                </Pressable>
              ) : d.recipeId ? (
                <View style={styles.actions}>
                  <Button
                    label="Recipe"
                    variant="secondary"
                    small
                    accessibilityLabel={`Open recipe: ${d.title}`}
                    onPress={() => go(`/recipes/${d.recipeId}`)}
                  />
                  {d.versionId ? (
                    <Button
                      label="Cook"
                      icon="play"
                      small
                      accessibilityLabel={`Cook ${d.title}`}
                      onPress={() => go(`/cook/${d.versionId}`)}
                    />
                  ) : null}
                </View>
              ) : (
                <Text variant="small">No recipe</Text>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {mode === 'add' ? (
        <RecipePicker
          mealId={mealId}
          course="main"
          showListWhenEmpty={false}
          placeholder="Search your recipes or type a dish"
          onPick={(hit) => addDish({ versionId: hit.versionId })}
          onAddWithoutRecipe={(t) => addDish({ description: t })}
          onClose={planned || dishes.length ? () => setMode('view') : undefined}
          autoFocus={false}
        />
      ) : null}
      {error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {mode === 'view' ? (
        <View style={styles.row}>
          <Button
            label="Add a dish"
            icon="plus"
            variant="soft"
            small
            onPress={() => setMode('add')}
          />
          {dishes.length ? (
            <Button
              label="Edit"
              icon="edit"
              variant="ghost"
              small
              onPress={() => setMode('edit')}
            />
          ) : null}
        </View>
      ) : null}
      {mode === 'edit' ? (
        <View style={styles.row}>
          <Button label="Done" small onPress={() => setMode('view')} />
          {meal?.id && !meal.hosted ? (
            <Button
              label="Remove meal"
              variant="danger"
              small
              onPress={() =>
                run(async () => {
                  await del.mutateAsync(meal.id as Id)
                  onClose()
                })
              }
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.xs },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    backgroundColor: colors.subtle,
    borderRadius: radius.tile,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minHeight: size.touch,
  },
  dishTitle: { flex: 1, minWidth: 140, fontFamily: fonts.bodySemiBold, fontSize: fontSize.md },
  actions: { flexDirection: 'row', gap: space.xs },
  x: { width: size.touch, height: size.touch - 8, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
})
