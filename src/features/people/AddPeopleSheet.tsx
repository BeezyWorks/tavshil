import React, { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'

import { Button, ConstraintText, Disclaimer, Segmented, Sheet, Text, TextField } from '@/components'
import { Icon } from '@/components/Icon'
import type { ConstraintInput, ConstraintLabel, NewPerson } from '@/lib/api/types'
import { parseBirthInput } from '@/lib/dates'
import { QUICK_CONSTRAINTS, type QuickConstraint } from '@/lib/strings'
import { colors, fontSize, fonts, radius, size, space, tones } from '@/theme/tokens'

interface Draft {
  key: number
  name: string
  child: boolean
  birth: string
  /** Keys of the quick picks that are on. */
  picks: string[]
  /** Foods typed in by hand ("cilantro"): saved as flexible ingredient constraints. */
  other: string[]
}

let seq = 0
const blank = (): Draft => ({ key: ++seq, name: '', child: false, birth: '', picks: [], other: [] })

const toConstraint = (q: QuickConstraint): ConstraintInput => ({
  tagType: q.tagType,
  tag: q.tag,
  kind: q.kind,
  severity: q.severity,
  activeWhen: 'always',
})

/** A filled-in row as the API takes it, or null while its age is unreadable. */
function toPerson(d: Draft): NewPerson | null {
  const born = d.birth.trim() ? parseBirthInput(d.birth) : {}
  if (!born) return null
  return {
    name: d.name.trim(),
    isChild: d.child,
    ...born,
    constraints: [
      ...QUICK_CONSTRAINTS.filter((q) => d.picks.includes(q.key)).map(toConstraint),
      ...d.other.map((tag): ConstraintInput => ({
        tagType: 'ingredient',
        tag,
        kind: 'preference',
        severity: 'flexible',
        activeWhen: 'always',
      })),
    ],
  }
}

/**
 * Add a whole household, or more people to one, in a single sheet: names, adult or child, and what each can't
 * eat from one-tap picks. One save sends it all. Finer detail (dates, notes, minhagim) stays on the person page.
 */
export function AddPeopleSheet({
  householdName,
  saving,
  error,
  onSave,
  onClose,
}: {
  /** Set when adding to an existing household; otherwise the sheet asks for a household name. */
  householdName?: string
  saving: boolean
  error?: Error | null
  onSave: (input: { name: string; people: NewPerson[] }) => void
  onClose: () => void
}) {
  const isNew = householdName === undefined
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Draft[]>(() => [blank()])
  const [latest, setLatest] = useState<number | null>(isNew ? null : rows[0].key)
  // One person is open for editing at a time; the rest fold down to a summary line.
  const [open, setOpen] = useState(rows[0].key)

  const edit = (key: number, patch: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRow = () => {
    const r = blank()
    setRows((rs) => [...rs, r])
    setLatest(r.key)
    setOpen(r.key)
  }

  // Rows left completely empty are ignored, so a spare blank row never blocks saving.
  const used = rows.filter(
    (r) => r.name.trim() || r.picks.length || r.other.length || r.birth.trim(),
  )
  const unnamed = used.some((r) => !r.name.trim())
  const people = used.map(toPerson)
  const badAge = people.some((p) => p === null)
  const ready = (isNew ? !!name.trim() : used.length > 0) && !unnamed && !badAge && !saving
  const anyAllergy = used.some((r) =>
    r.picks.some((k) => QUICK_CONSTRAINTS.find((q) => q.key === k)?.tagType === 'allergen'),
  )

  const save = () => {
    if (ready) onSave({ name: name.trim(), people: people as NewPerson[] })
  }
  const n = used.length
  const label = isNew
    ? n
      ? `Save household · ${n} ${n === 1 ? 'person' : 'people'}`
      : 'Save household'
    : n > 1
      ? `Add ${n} people`
      : 'Add person'

  return (
    <Sheet
      title={isNew ? 'New household' : `Add to ${householdName}`}
      onClose={onClose}
      footer={
        <>
          {unnamed ? (
            <Text variant="small" color={colors.danger}>
              Give everyone a name.
            </Text>
          ) : null}
          {error ? (
            <Text variant="small" color={colors.danger}>
              {error.message}
            </Text>
          ) : null}
          <Button label={label} full disabled={!ready} loading={saving} onPress={save} />
        </>
      }
    >
      {isNew ? (
        <TextField
          label="Household name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Levins"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => setLatest(rows[0].key)}
        />
      ) : null}

      {rows.map((r, i) =>
        r.key !== open ? (
          <PersonSummary
            key={r.key}
            draft={r}
            index={i}
            onOpen={() => {
              setOpen(r.key)
              setLatest(null)
            }}
          />
        ) : (
          <PersonDraft
            key={r.key}
            draft={r}
            index={i}
            focus={latest === r.key}
            onChange={(patch) => edit(r.key, patch)}
            onRemove={
              rows.length > 1 ? () => setRows((rs) => rs.filter((x) => x.key !== r.key)) : undefined
            }
            onNext={i === rows.length - 1 ? addRow : undefined}
          />
        ),
      )}

      <Button label="Add another person" icon="plus" variant="soft" onPress={addRow} />
      {anyAllergy ? <Disclaimer /> : null}
    </Sheet>
  )
}

/** A person you have moved on from: one line with what they can't eat. Tap to edit again. */
function PersonSummary({
  draft: d,
  index,
  onOpen,
}: {
  draft: Draft
  index: number
  onOpen: () => void
}) {
  const age = d.birth.trim() ? parseBirthInput(d.birth) : null
  const meta = [
    d.child ? 'Child' : 'Adult',
    age && 'age' in age ? `age ${age.age}` : age ? `born ${d.birth.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const labels: ConstraintLabel[] = [
    ...QUICK_CONSTRAINTS.filter((q) => d.picks.includes(q.key)).map((q) => ({
      text: q.tagType === 'allergen' ? `${q.label} allergy` : q.label,
      strict: q.severity === 'strict',
      strictAllergy: q.tagType === 'allergen',
    })),
    ...d.other.map((o) => ({ text: `No ${o}`, strict: false, strictAllergy: false })),
  ]
  const named = d.name.trim()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${named || `person ${index + 1}`}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.person, styles.folded, pressed && { opacity: 0.7 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={named ? colors.ink : colors.muted}>
          {named || `Person ${index + 1}`}
          <Text variant="small" color={colors.muted}>
            {'  '}
            {meta}
          </Text>
        </Text>
        <Text variant="small" color={colors.muted}>
          {labels.length ? <ConstraintText constraints={labels} /> : 'Eats everything'}
        </Text>
      </View>
      <Icon name="edit" size={16} color={colors.muted} />
    </Pressable>
  )
}

function PersonDraft({
  draft: d,
  index,
  focus,
  onChange,
  onRemove,
  onNext,
}: {
  draft: Draft
  index: number
  focus: boolean
  onChange: (patch: Partial<Draft>) => void
  onRemove?: () => void
  onNext?: () => void
}) {
  const [typing, setTyping] = useState('')
  const toggle = (k: string) =>
    onChange({ picks: d.picks.includes(k) ? d.picks.filter((x) => x !== k) : [...d.picks, k] })
  const addOther = () => {
    const t = typing.trim().toLowerCase()
    if (t && !d.other.includes(t)) onChange({ other: [...d.other, t] })
    setTyping('')
  }
  const birthBad = !!d.birth.trim() && !parseBirthInput(d.birth)
  const who = d.name.trim() || `Person ${index + 1}`

  return (
    <View style={styles.person}>
      <View style={styles.head}>
        <TextInput
          accessibilityLabel={`Name of person ${index + 1}`}
          value={d.name}
          onChangeText={(name) => onChange({ name })}
          placeholder={index === 0 ? 'Name, e.g. Dana' : 'Name'}
          placeholderTextColor={colors.muted}
          autoFocus={focus}
          returnKeyType={onNext ? 'next' : 'done'}
          blurOnSubmit={!onNext}
          onSubmitEditing={() => d.name.trim() && onNext?.()}
          style={styles.name}
        />
        {onRemove ? (
          <Button
            label={`Remove ${who}`}
            icon="close"
            iconOnly
            variant="ghost"
            small
            onPress={onRemove}
          />
        ) : null}
      </View>

      <View style={styles.ageRow}>
        <Segmented
          options={[
            { value: 'adult', label: 'Adult' },
            { value: 'child', label: 'Child' },
          ]}
          value={d.child ? 'child' : 'adult'}
          onChange={(v) => onChange({ child: v === 'child' })}
        />
        {d.child ? (
          <TextInput
            accessibilityLabel={`Age or birthday of ${who}`}
            value={d.birth}
            onChangeText={(birth) => onChange({ birth })}
            placeholder="Age, or YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={[styles.age, birthBad && styles.bad]}
          />
        ) : null}
      </View>
      {birthBad ? (
        <Text variant="small" color={colors.danger}>
          Use a whole number for an age, or a date like 2019-03-14.
        </Text>
      ) : null}

      <Text variant="label">Can’t eat</Text>
      <View style={styles.chips}>
        {QUICK_CONSTRAINTS.map((q) => (
          <Chip
            key={q.key}
            label={q.label}
            tone={q.tagType === 'allergen' ? 'danger' : q.kind === 'religious' ? 'info' : 'accent'}
            on={d.picks.includes(q.key)}
            onPress={() => toggle(q.key)}
          />
        ))}
        {d.other.map((o) => (
          <Chip
            key={`o-${o}`}
            label={`${o} ✕`}
            tone="warn"
            on
            accessibilityLabel={`Remove ${o}`}
            onPress={() => onChange({ other: d.other.filter((x) => x !== o) })}
          />
        ))}
        <TextInput
          accessibilityLabel={`Something else ${who} doesn’t eat`}
          value={typing}
          onChangeText={setTyping}
          onSubmitEditing={addOther}
          onBlur={addOther}
          placeholder="+ Something else"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          blurOnSubmit={false}
          style={styles.other}
        />
      </View>
    </View>
  )
}

function Chip({
  label,
  tone,
  on,
  onPress,
  accessibilityLabel,
}: {
  label: string
  tone: 'danger' | 'info' | 'accent' | 'warn'
  on: boolean
  onPress: () => void
  accessibilityLabel?: string
}) {
  const t = tones[tone]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        on && { backgroundColor: t.bg, borderColor: t.fg },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={{
          fontFamily: on ? fonts.bodySemiBold : fonts.bodyMedium,
          fontSize: fontSize.sm,
          color: on ? t.fg : colors.ink,
        }}
      >
        {on && !accessibilityLabel ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  person: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.subtle,
  },
  folded: { flexDirection: 'row', alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: {
    flex: 1,
    minHeight: size.touch,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: space.xs,
  },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  age: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: size.touch,
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  bad: { borderColor: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  other: {
    minHeight: 36,
    minWidth: 150,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
})
