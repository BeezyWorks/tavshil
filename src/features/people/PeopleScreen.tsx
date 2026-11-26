import { type Href } from 'expo-router'
import { useTabRouter } from '@/lib/tabRoute'
import React, { useState } from 'react'

import {
  Button,
  Card,
  ConstraintText,
  ListRow,
  Loading,
  Screen,
  SearchField,
  Text,
} from '@/components'
import { useContacts, useCreateContactHousehold, useHousehold } from '@/lib/api/hooks'
import type { Constraint } from '@/lib/api/types'
import { colors, type Tone } from '@/theme/tokens'

import { AddPeopleSheet } from './AddPeopleSheet'
import { combinedConstraints, displayName, householdCounts, matches } from './householdText'

export function constraintTone(c: Constraint): Tone {
  if (c.kind === 'medical') return c.severity === 'strict' ? 'danger' : 'warn'
  if (c.kind === 'religious') return c.tagType === 'kashrut-sourcing' ? 'info' : 'warn'
  return 'muted'
}

/** One row per household; open one to see and edit its members. */
export function PeopleScreen() {
  const router = useTabRouter()
  const household = useHousehold()
  const contacts = useContacts()
  const create = useCreateContactHousehold()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const all = household.data && contacts.data ? [household.data, ...contacts.data] : null
  const shown = all?.filter((h) => matches(h, q)) ?? []

  return (
    <Screen
      title="People"
      subtitle="Households you cook for. Contacts are private to your household."
      actions={<Button label="New household" icon="plus" small onPress={() => setAdding(true)} />}
    >
      {adding ? (
        <AddPeopleSheet
          saving={create.isPending}
          error={create.error as Error | null}
          onClose={() => {
            setAdding(false)
            create.reset()
          }}
          onSave={(input) =>
            create.mutate(input, {
              onSuccess: (h) => {
                setAdding(false)
                router.push(`/people/household/${h.id}` as Href)
              },
            })
          }
        />
      ) : null}
      {!all ? (
        <Loading />
      ) : (
        <>
          <SearchField value={q} onChangeText={setQ} placeholder="Search households or people" />
          <Card>
            {shown.map((h, i) => {
              const combined = combinedConstraints(h.people)
              return (
                <ListRow
                  key={h.id}
                  title={displayName(h)}
                  subtitle={householdCounts(h) || 'No one yet'}
                  href={`/people/household/${h.id}`}
                  last={i === shown.length - 1}
                >
                  <Text variant="small">
                    {combined.length ? (
                      <ConstraintText constraints={combined} />
                    ) : (
                      <Text variant="small" color={colors.muted}>
                        No constraints
                      </Text>
                    )}
                  </Text>
                </ListRow>
              )
            })}
            {shown.length === 0 ? (
              <Text color={colors.muted}>
                {q ? 'No household or person matches.' : 'Nothing here yet.'}
              </Text>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  )
}
