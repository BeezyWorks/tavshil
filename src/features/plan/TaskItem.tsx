import { type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Checkbox, Text } from '@/components'
import { useSetPrepDone } from '@/lib/api/hooks'
import type { PrepTask } from '@/lib/api/types'
import { useTabRouter } from '@/lib/tabRoute'
import { PLAN, PREP } from '@/lib/strings'
import { colors, fonts } from '@/theme/tokens'

import { lowerTime } from '../prep/model'

/**
 * A prep task in a side panel: tick, time, what to do, and quick links to the recipe and cooking mode.
 * `inDish` when it sits under its dish (the dish is the recipe link, and names the meal); `day` prefixes the
 * time when the task falls on another day than the meal.
 */
export function TaskItem({
  task: t,
  inDish,
  day,
}: {
  task: PrepTask
  inDish?: boolean
  day?: string
}) {
  const router = useTabRouter()
  const set = useSetPrepDone()
  const recipe =
    t.recipeId && !inDish ? () => router.push(`/recipes/${t.recipeId}` as Href) : undefined
  const cook =
    t.versionId && t.kind === 'active'
      ? () => router.push(`/cook/${t.versionId}` as Href)
      : undefined
  const sitting = t.waitUntil ?? (t.passive ? t.endTime : undefined)
  const sub = [
    t.passive || t.waitUntil ? (sitting ? PREP.sitsUntil(lowerTime(sitting)) : PREP.passive) : '',
    inDish ? '' : t.mealName,
  ].filter(Boolean)
  return (
    <View style={styles.row}>
      <Checkbox
        label={`${t.done ? 'Mark not done' : 'Done'}: ${t.text}`}
        checked={t.done}
        onChange={(done) => set.mutate([{ key: t.id, done }])}
      />
      <View style={styles.body}>
        <Text style={[styles.time, !t.done && styles.timeOn]}>
          {day ? `${day}\n${lowerTime(t.time)}` : lowerTime(t.time)}
        </Text>
        <View style={styles.main}>
          <Text style={[styles.text, t.done && styles.done]}>
            {inDish && t.label ? t.label : t.text}
          </Text>
          {sub.length ? <Text style={styles.sub}>{sub.join(' · ')}</Text> : null}
          {recipe || cook ? (
            <View style={styles.links}>
              {recipe ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${PLAN.recipe}: ${t.dish || t.text}`}
                  onPress={recipe}
                  hitSlop={8}
                >
                  <Text style={styles.link}>{`${PLAN.recipe} ›`}</Text>
                </Pressable>
              ) : null}
              {cook ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${PLAN.cook}: ${t.dish || t.text}`}
                  onPress={cook}
                  hitSlop={8}
                >
                  <Text style={styles.link}>{`${PLAN.cook} ›`}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 8, paddingTop: 11 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  time: { width: 58, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.muted },
  timeOn: { color: colors.ink, fontFamily: fonts.bodySemiBold },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  links: { flexDirection: 'row', gap: 16, paddingTop: 2 },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
})
