import { Stack, useRouter, type Href } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { NAV, NEXT_PREP } from '@/lib/strings'
import { colors, fonts, fontSize, space } from '@/theme/tokens'

import { AppGate } from './AppGate'
import { badgeText, useNavCounts, type NextPrep } from './counts'

/**
 * iOS: system tabs. iPhone gets Plan, Shopping, Prep, Recipes, More (People lives in More);
 * iPad adds People as its own tab, with the tab bar at the top as the system draws it there
 * (no sidebar: the bar stays put rather than folding out to the side).
 * Each tab is a route group with its own stack (see the `(plan,shopping,...)/_layout` files).
 */
export function NativeAppLayout() {
  return (
    <AppGate>
      <Tabs />
    </AppGate>
  )
}

function NextPrepAccessory({ next }: { next: NextPrep }) {
  const router = useRouter()
  const placement = NativeTabs.BottomAccessory.usePlacement()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${NEXT_PREP}: ${next.when}, ${next.text}`}
      accessibilityHint="Opens the prep schedule"
      onPress={() => router.navigate(NAV.prep.href as Href)}
      style={styles.accessory}
    >
      <View style={styles.dot} />
      <Text numberOfLines={1} style={styles.accessoryText}>
        <Text style={styles.accessoryTime}>{next.when}</Text>
        {` · ${next.text}`}
      </Text>
      {placement === 'regular' ? <Text variant="small">{NEXT_PREP}</Text> : null}
    </Pressable>
  )
}

function Tabs() {
  const counts = useNavCounts()
  const pad = Platform.OS === 'ios' && Platform.isPad
  const shopping = badgeText(counts.shopping)
  const prep = badgeText(counts.prep)
  return (
    <NativeTabs tintColor={colors.accent}>
      {!pad && counts.next ? (
        <NativeTabs.BottomAccessory>
          <NextPrepAccessory next={counts.next} />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="(plan)">
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>{NAV.plan.label}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(shopping)">
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
        <NativeTabs.Trigger.Label>{NAV.shopping.label}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!shopping}>{shopping}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(prep)">
        <NativeTabs.Trigger.Icon sf="timer" />
        <NativeTabs.Trigger.Label>{NAV.prep.label}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!prep}>{prep}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(recipes)">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>{NAV.recipes.label}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {pad ? (
        <NativeTabs.Trigger name="(people)">
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          <NativeTabs.Trigger.Label>{NAV.people.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="(more)">
        <NativeTabs.Trigger.Icon sf="ellipsis" />
        <NativeTabs.Trigger.Label>{NAV.more.label}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

/**
 * Each tab's root screen, kept under whatever a link opens in that tab, so a deep link still has
 * a way back. People is only a tab on iPad; on iPhone its screens open inside More.
 */
export const tabAnchors = {
  plan: { anchor: 'index' },
  shopping: { anchor: 'shopping' },
  prep: { anchor: 'prep' },
  recipes: { anchor: 'recipes/index' },
  ...(Platform.OS === 'ios' && Platform.isPad ? { people: { anchor: 'people/index' } } : {}),
  more: { anchor: 'more' },
}

/** A tab's own stack, so detail screens push inside the tab and swipe back. */
export function NativeTabLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}
    />
  )
}

const styles = StyleSheet.create({
  accessory: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg + 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  accessoryText: { flex: 1, fontSize: fontSize.sm + 1, color: colors.ink },
  accessoryTime: { fontFamily: fonts.bodySemiBold },
})
