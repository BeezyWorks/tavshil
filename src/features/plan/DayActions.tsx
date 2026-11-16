import { useRouter, type Href } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Pill, Text, TextField } from '@/components'
import { useCreatePlanMeal } from '@/lib/api/hooks'
import type { DaySlot, Id, ISODate } from '@/lib/api/types'
import { longDate } from '@/lib/dates'
import { PICKABLE_SLOTS, SLOT_LABEL, wizardHref } from '@/lib/plan'
import { colors, space } from '@/theme/tokens'

import { Sheet } from '@/components/Sheet'

/** `6:30` or `18:30` to `HH:MM`; empty or unreadable is no time. */
function cleanTime(t: string): string | undefined {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(t.trim())
  if (!m || +m[1] > 23 || +m[2] > 59) return undefined
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/** Host a meal on a day: name, kind, time, then the wizard for guests. */
export function DayActions({ date, onClose }: { date: ISODate; onClose: () => void }) {
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<DaySlot>('dinner')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const create = useCreatePlanMeal()

  const host = async () => {
    setError('')
    if (time.trim() && !cleanTime(time)) return setError('Time looks like 18:30.')
    try {
      const m = await create.mutateAsync({
        date,
        name: name.trim() || undefined,
        slot,
        time: cleanTime(time),
        hosted: true,
      })
      onClose()
      router.push(wizardHref(m.id as Id) as Href)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Sheet title={`Host a meal on ${longDate(date)}`} onClose={onClose}>
      <View style={styles.col}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Optional, e.g. Bubby's birthday"
          autoFocus
        />
        <View style={{ gap: space.xs }}>
          <Text variant="label">Kind</Text>
          <View style={styles.pills}>
            {PICKABLE_SLOTS.map((s) => (
              <Pill
                key={s}
                label={SLOT_LABEL[s]}
                selected={s === slot}
                onPress={() => setSlot(s)}
              />
            ))}
          </View>
        </View>
        <TextField
          label="Time (optional)"
          value={time}
          onChangeText={setTime}
          placeholder="18:30"
          onSubmitEditing={host}
        />
        <Button label="Next: guests" loading={create.isPending} onPress={host} />
      </View>
      {error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  col: { gap: space.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
})
