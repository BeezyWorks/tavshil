import { usePathname, useRouter, type Href } from 'expo-router'
import React, { useState } from 'react'
import { Image, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text, useLayout } from '@/components'
import { Icon } from '@/components/Icon'
import { NAV, NAV_MENU } from '@/lib/strings'
import { colors, fontSize, fonts, radius, size, space } from '@/theme/tokens'

import { badgeText, useNavCounts } from './counts'
import { NARROW_TABS, SECTION_ICON, WIDE_TABS, sectionOf, type Section } from './sections'

const LOGO = require('../../../assets/brand/icon.png')

/** Glass blur where the browser has it; the translucent fill alone elsewhere. */
const blur = (Platform.OS === 'web' ? { backdropFilter: 'blur(22px)' } : {}) as ViewStyle

function useBadges(): Partial<Record<Section, string>> {
  const counts = useNavCounts()
  return { plan: badgeText(counts.prep), shopping: badgeText(counts.shopping) }
}

function Brand() {
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Tavshil, this week"
      onPress={() => router.push('/' as Href)}
      style={styles.brand}
    >
      <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
      <Text style={styles.brandText}>Tavshil</Text>
    </Pressable>
  )
}

const MENU = [NAV_MENU.settings, NAV_MENU.kitchen, NAV_MENU.about]

/** The gear at the right of the top nav: Settings, Kitchen, About and support. */
function GearMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { top } = useSafeAreaInsets()
  const go = (href: string) => {
    setOpen(false)
    router.push(href as Href)
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NAV_MENU.title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.gear,
          blur,
          hovered && styles.gearHover,
        ]}
      >
        <Icon name="gear" size={20} color={colors.ink} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Close menu"
          onPress={() => setOpen(false)}
        />
        <View
          style={[styles.menu, { top: top + space.lg + 44 }]}
          accessibilityRole="menu"
          aria-label={NAV_MENU.title}
        >
          {MENU.map((m, i) => (
            <Pressable
              key={m.href}
              accessibilityRole="menuitem"
              onPress={() => go(m.href)}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.menuItem,
                i > 0 && styles.menuDivider,
                hovered && styles.menuHover,
              ]}
            >
              <Text variant="bodyStrong">{m.label}</Text>
              <Text variant="small">{m.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  )
}

/** Wide screens (web and the iPad-sized browser): brand, a glass pill of sections, the gear. */
export function TopNav() {
  const path = usePathname()
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const badges = useBadges()
  const active = sectionOf(path, true)
  return (
    <View style={[styles.top, { paddingTop: top + space.md }]} role="navigation">
      <View style={styles.side}>
        <Brand />
      </View>
      <View style={[styles.pill, blur]} accessibilityRole="tablist">
        {WIDE_TABS.map((s) => {
          const on = s === active
          return (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badges[s] ? `${NAV[s].label}, ${badges[s]}` : NAV[s].label}
              onPress={() => router.push(NAV[s].href as Href)}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.pillTab,
                on ? styles.pillOn : hovered && styles.pillHover,
              ]}
            >
              <Icon name={SECTION_ICON[s]} size={18} color={on ? colors.accent : colors.ink} />
              <Text style={[styles.pillLabel, on && styles.pillLabelOn]}>{NAV[s].label}</Text>
              {badges[s] ? <Text style={styles.count}>{badges[s]}</Text> : null}
            </Pressable>
          )
        })}
      </View>
      <View style={[styles.side, styles.sideEnd]}>
        <GearMenu />
      </View>
    </View>
  )
}

/** Narrow web: bottom tabs. People and the rest live under More. */
export function BottomTabs() {
  const path = usePathname()
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()
  const badges = useBadges()
  const active = sectionOf(path, false)
  return (
    <View
      style={[styles.tabs, { height: size.tabBarHeight + bottom, paddingBottom: bottom }]}
      accessibilityRole="tablist"
    >
      {NARROW_TABS.map((s) => {
        const on = s === active
        const tint = on ? colors.accent : colors.ink
        return (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badges[s] ? `${NAV[s].label}, ${badges[s]}` : NAV[s].label}
            onPress={() => router.push(NAV[s].href as Href)}
            style={styles.tab}
          >
            <View style={[styles.tabIcon, on && styles.tabIconOn]}>
              <Icon name={SECTION_ICON[s]} size={22} color={tint} />
              {badges[s] ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badges[s]}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, { color: tint }]}>{NAV[s].label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** The web (and Android) frame: the top nav on wide screens, bottom tabs on narrow ones. */
export function Shell({ children }: { children: React.ReactNode }) {
  const { wide } = useLayout()
  const insets = useSafeAreaInsets()
  // The nav bars absorb the top and bottom insets, so screens inside must not add them again.
  const inner = { ...insets, top: wide ? 0 : insets.top, bottom: 0 }
  return (
    <View style={styles.shell}>
      {wide ? <TopNav /> : null}
      <View style={styles.body}>
        <SafeAreaInsetsContext.Provider value={inner}>{children}</SafeAreaInsetsContext.Provider>
      </View>
      {wide ? null : <BottomTabs />}
    </View>
  )
}

const floating: ViewStyle = {
  backgroundColor: colors.glass,
  borderWidth: 1,
  borderColor: colors.glassEdge,
  shadowColor: colors.shadow,
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 6 },
}

const SIDE = 160

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.ground },
  body: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  side: { width: SIDE },
  sideEnd: { alignItems: 'flex-end' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: size.touch },
  logo: { width: size.brandIcon, height: size.brandIcon, borderRadius: radius.icon },
  brandText: { fontFamily: fonts.display, fontSize: 22, color: colors.accent },
  pill: {
    ...floating,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 5,
    borderRadius: radius.pill,
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  pillOn: { backgroundColor: colors.accentTint },
  pillHover: { backgroundColor: colors.subtle },
  pillLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSize.md, color: colors.ink },
  pillLabelOn: { fontFamily: fonts.bodySemiBold, color: colors.accent },
  count: { fontFamily: fonts.bodySemiBold, fontSize: fontSize.xs, color: colors.muted },
  gear: {
    ...floating,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 14,
    shadowOpacity: 0.08,
  },
  gearHover: { backgroundColor: colors.surface },
  backdrop: StyleSheet.absoluteFill,
  menu: {
    position: 'absolute',
    right: space.xl,
    width: 300,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: space.xs,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  menuItem: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 2 },
  menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  menuHover: { backgroundColor: colors.subtle },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.xs,
  },
  tab: { flex: 1, minHeight: size.touch, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: {
    width: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconOn: { backgroundColor: colors.accentTint },
  tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSize.xs - 1 },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.onAccent,
  },
})
