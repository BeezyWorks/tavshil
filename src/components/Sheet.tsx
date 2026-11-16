import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { colors, space } from '@/theme/tokens'

import { Button } from './Button'
import { Card } from './Card'
import { Text } from './Text'

/**
 * A centred dialog over a dimmed page. Used for the day menu, "Host a meal…", the in-place dish editor and adding
 * people. A `footer` (the save button) stays in view below the scrolling body.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={styles.root}
      >
        <View pointerEvents="none" style={styles.backdrop} />
        {/* Swallow presses so only the dimmed area outside the card dismisses. */}
        <Pressable accessible={false} onPress={() => undefined} style={styles.card}>
          <Card style={styles.panel}>
            <View style={styles.head}>
              <Text variant="h3" accessibilityRole="header" style={{ flex: 1 }}>
                {title}
              </Text>
              <Button label="Close" variant="ghost" small onPress={onClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={styles.body}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    opacity: 0.4,
  },
  card: { width: '100%', maxWidth: 520, maxHeight: '88%', cursor: 'default' as never },
  // The panel and its body shrink to the dialog's max height so the body scrolls and the footer stays in view.
  panel: { flexShrink: 1, maxHeight: '100%' },
  scroll: { flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  body: { gap: space.md },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md, gap: space.sm },
})
