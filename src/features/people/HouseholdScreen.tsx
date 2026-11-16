import { useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Button, Card, ConstraintText, ListRow, Loading, Screen, Text } from '@/components'
import { useAddPeople, useContacts, useHousehold } from '@/lib/api/hooks'
import type { Household } from '@/lib/api/types'
import { colors, space } from '@/theme/tokens'

import { AddPeopleSheet } from './AddPeopleSheet'
import { combinedConstraints, displayName, householdCounts, labelOf } from './householdText'

/** A household opened from the People list: its members, each linking to PersonScreen for constraints. */
export function HouseholdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const own = useHousehold()
  const contacts = useContacts()
  const [adding, setAdding] = useState(false)
  if (!own.data || !contacts.data)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  const h = [own.data, ...contacts.data].find((x) => x.id === id)
  if (!h)
    return (
      <Screen title="Household not found" back={{ label: 'People', href: '/people' }}>
        <Text>We could not find that household.</Text>
      </Screen>
    )
  return (
    <Screen
      back={{ label: 'People', href: '/people' }}
      title={displayName(h)}
      subtitle={[householdCounts(h), h.note].filter(Boolean).join(' · ')}
      actions={<Button label="Add people" icon="plus" small onPress={() => setAdding(true)} />}
    >
      {adding ? <AddToHousehold household={h} onDone={() => setAdding(false)} /> : null}
      <Card>
        {h.people.length === 0 ? (
          <Text color={colors.muted}>No one here yet. Add the people and what they can’t eat.</Text>
        ) : null}
        {h.people.map((p, i) => (
          <ListRow
            key={p.id}
            title={p.name}
            subtitle={[p.isChild ? 'Child' : '', p.age ? `age ${p.age}` : '', p.relation]
              .filter(Boolean)
              .join(' · ')}
            href={`/people/${p.id}`}
            last={i === h.people.length - 1}
          >
            <View style={styles.row}>
              {p.link ? <Badge label="Linked profile" tone="accent" /> : null}
              {p.constraints.length === 0 ? (
                <Text variant="small" color={colors.muted}>
                  No constraints
                </Text>
              ) : (
                <ConstraintText constraints={labelOf(p)} />
              )}
            </View>
          </ListRow>
        ))}
      </Card>
      {h.people.length > 1 ? (
        <Text variant="small" color={colors.muted}>
          Together: <ConstraintText constraints={combinedConstraints(h.people)} />
        </Text>
      ) : null}
    </Screen>
  )
}

function AddToHousehold({ household, onDone }: { household: Household; onDone: () => void }) {
  const add = useAddPeople(household)
  return (
    <AddPeopleSheet
      householdName={displayName(household)}
      saving={add.isPending}
      error={add.error as Error | null}
      onClose={onDone}
      onSave={({ people }) => add.mutate(people, { onSuccess: onDone })}
    />
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, alignItems: 'center' },
})
