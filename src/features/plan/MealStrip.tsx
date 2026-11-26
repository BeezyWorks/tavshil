import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { Icon } from '@/components/Icon'
import { useToday } from '@/lib/api/hooks'
import type { ISODate } from '@/lib/api/types'
import { colors, fonts, radius, space } from '@/theme/tokens'

import { dayLabel, mealTitle } from './model'

const isDate = (s?: string): s is ISODate => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
/** A bare slot ("Dinner") reads as "Tonight’s dinner"; a meal's own name ("Friday night dinner") shows as is. */
const SLOT_WORD = /^(breakfast|kiddush|brunch|lunch|seudah shlishit|dinner)$/i

/**
 * A slim strip on a recipe page opened from a weeknight meal: `Tonight’s dinner · Mon 16 · 4 people`, and back to
 * the plan. The meal comes in the query (`?meal=…&date=…&slot=Dinner&people=4`); without it nothing shows.
 */
export function MealStrip() {
  const q = useLocalSearchParams<{ meal?: string; date?: string; slot?: string; people?: string }>()
  const router = useRouter()
  const today = useToday()
  if (!q.meal || !isDate(q.date) || !today) return null
  const date = q.date
  const slot = q.slot || 'Dinner'
  const people = Number(q.people) || 0
  const back = () => (router.canGoBack() ? router.back() : router.replace('/' as Href))
  return (
    // The whole bar is the way back, not just the arrow.
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to the plan"
      onPress={back}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.strip,
        (pressed || hovered) && styles.stripOn,
      ]}
    >
      <View style={styles.back}>
        <Icon name="back" size={18} color={colors.accent} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        <Text style={styles.strong}>
          {SLOT_WORD.test(slot) ? mealTitle({ date, slotLabel: slot, name: slot }, today) : slot}
        </Text>
        {` · ${dayLabel(date)}${people ? ` · ${people} ${people === 1 ? 'person' : 'people'}` : ''}`}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.tile,
    paddingHorizontal: space.sm,
    minHeight: 48,
  },
  stripOn: { opacity: 0.7 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.accent },
  strong: { fontFamily: fonts.bodySemiBold },
})
