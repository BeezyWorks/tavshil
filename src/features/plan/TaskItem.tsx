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
 * `hideMeal` when the panel is already about that meal.
 */
export function TaskItem({ task: t, hideMeal }: { task: PrepTask; hideMeal?: boolean }) {
  const router = useTabRouter()
  const set = useSetPrepDone()
  const recipe = t.recipeId ? () => router.push(`/recipes/${t.recipeId}` as Href) : undefined
  const cook =
    t.versionId && t.kind === 'active'
      ? () => router.push(`/cook/${t.versionId}` as Href)
      : undefined
  const sitting = t.waitUntil ?? (t.passive ? t.endTime : undefined)
  const sub = [
    t.passive || t.waitUntil ? (sitting ? PREP.sitsUntil(lowerTime(sitting)) : PREP.passive) : '',
    hideMeal ? '' : t.mealName,
  ].filter(Boolean)
  return (
    <View style={styles.row}>
      <Checkbox
        label={`${t.done ? 'Mark not done' : 'Done'}: ${t.text}`}
        checked={t.done}
        onChange={(done) => set.mutate([{ key: t.id, done }])}
      />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={[styles.time, !t.done && styles.timeOn]}>{lowerTime(t.time)}</Text>
          <Text style={[styles.text, t.done && styles.done]}>{t.text}</Text>
        </View>
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
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  body: { flex: 1, minWidth: 0, gap: 2, paddingTop: 11 },
  line: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  time: { width: 58, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  timeOn: { color: colors.ink, fontFamily: fonts.bodySemiBold },
  text: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  sub: { marginLeft: 66, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  links: { marginLeft: 66, flexDirection: 'row', gap: 16, paddingTop: 2 },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
})
