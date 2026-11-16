import { Redirect } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Switch, View } from 'react-native'

import { Card, Screen, Segmented, Text } from '@/components'
import { canNotify, ensurePermission } from '@/features/cook/notifications'
import { REMINDERS } from '@/lib/strings'
import { colors, space } from '@/theme/tokens'

import { LEAD_OPTIONS, type LeadMinutes } from './plan'
import { useReminderSettings } from './settings'

function ToggleRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string
  hint: string
  value: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.line }}
        accessibilityLabel={title}
      />
    </View>
  )
}

/** Prep reminders: local notifications set on this phone. Not offered on the web. */
export function RemindersScreen() {
  const [settings, set] = useReminderSettings()
  const [denied, setDenied] = useState(false)

  // Turning a reminder on is the moment to ask; the phone only asks once.
  const toggle = (patch: { prePrep: boolean } | { cooking: boolean }) => {
    set(patch)
    if (!Object.values(patch).some(Boolean)) return
    void ensurePermission().then((ok) => setDenied(!ok))
  }

  if (!canNotify) return <Redirect href="/settings" />
  return (
    <Screen
      title={REMINDERS.title}
      back={{ label: 'Settings', href: '/settings' }}
      subtitle={REMINDERS.settingsHint}
    >
      <Card>
        <ToggleRow
          title={REMINDERS.prePrep}
          hint={REMINDERS.prePrepHint}
          value={settings.prePrep}
          onChange={(prePrep) => toggle({ prePrep })}
        />
        <ToggleRow
          title={REMINDERS.cooking}
          hint={REMINDERS.cookingHint}
          value={settings.cooking}
          onChange={(cooking) => toggle({ cooking })}
        />
        <View style={styles.lead}>
          <Text variant="bodyStrong">{REMINDERS.lead}</Text>
          <Segmented<`${LeadMinutes}`>
            options={LEAD_OPTIONS.map((m) => ({
              value: `${m}` as const,
              label: REMINDERS.leadLabel[m],
            }))}
            value={`${settings.lead}`}
            onChange={(v) => set({ lead: Number(v) as LeadMinutes })}
          />
        </View>
      </Card>
      {denied ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {REMINDERS.denied}
        </Text>
      ) : null}
      <Card tone="subtle">
        <Text variant="bodyStrong">{REMINDERS.restTitle}</Text>
        <Text variant="small">{REMINDERS.restBody}</Text>
      </Card>
      <Text variant="small" color={colors.muted}>
        {REMINDERS.footnote}
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  toggleText: { flex: 1, gap: 2 },
  lead: { gap: space.sm },
})
