import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Text, useLayout } from '@/components'
import { PLAN } from '@/lib/strings'
import { colors, fonts, radius, space } from '@/theme/tokens'

/**
 * A panel over a dimmed page: a bottom sheet on phones (slides up, grabber, half to most of the height), a centred
 * dialog when wide. The dimmed area is its own Pressable beside the panel, so no button sits inside another.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  action,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  /** Replaces the close button (e.g. a "Done" link). */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const { phone } = useLayout()
  return (
    <Modal
      transparent
      visible
      animationType={phone ? 'slide' : 'fade'}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[styles.root, phone ? styles.rootPhone : styles.rootWide]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PLAN.close}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.panel, phone ? styles.panelPhone : styles.panelWide]}>
          {phone ? <View style={styles.grabber} /> : null}
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {action ?? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PLAN.close}
                onPress={onClose}
                style={styles.x}
              >
                <Text style={{ fontSize: 16, color: colors.muted }}>{'✕'}</Text>
              </Pressable>
            )}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootPhone: { justifyContent: 'flex-end' },
  rootWide: { alignItems: 'center', justifyContent: 'center', padding: space.lg },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  panel: { backgroundColor: colors.surface, gap: space.md, overflow: 'hidden' },
  panelPhone: {
    borderTopLeftRadius: radius.group,
    borderTopRightRadius: radius.group,
    paddingTop: 10,
    maxHeight: '88%',
    minHeight: '50%',
  },
  panelWide: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: radius.group,
    paddingTop: space.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.line,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  x: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: 28 },
})
