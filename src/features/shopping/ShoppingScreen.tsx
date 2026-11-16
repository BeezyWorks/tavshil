import { useRouter, type Href } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native'

import {
  Badge,
  Button,
  Checkbox,
  Empty,
  Loading,
  Pill,
  Screen,
  Text,
  TextField,
} from '@/components'
import { api } from '@/lib/api/client'
import { useOptimisticMutation, useShopping, useToday } from '@/lib/api/hooks'
import type { ShoppingLine } from '@/lib/api/types'
import { storage } from '@/lib/storage'
import { SHOP } from '@/lib/strings'
import { colors, fontSize, fonts, radius, space } from '@/theme/tokens'

import {
  amountText,
  buildView,
  forWhat,
  moveBefore,
  pantrySummary,
  shopMeals,
  validSelection,
  type ShopGroup,
} from './model'

const KEY = 'tavshil.shopping.meals'

/** The meals picked on this device; none means everything. */
function useSelection(): [string[], (next: string[]) => void] {
  const [sel, setSel] = useState<string[]>(() => {
    try {
      const v = JSON.parse(storage.get(KEY) ?? '[]')
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
    } catch {
      return []
    }
  })
  const set = useCallback((next: string[]) => {
    setSel(next)
    storage.set(KEY, next.length ? JSON.stringify(next) : null)
  }, [])
  return [sel, set]
}

export function ShoppingScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const today = useToday()
  const all = useShopping()
  const [stored, setSelected] = useSelection()
  const meals = useMemo(() => shopMeals(all.data ?? []), [all.data])
  // Wait for the whole list before trusting a stored pick: until then every meal looks gone.
  const selected = useMemo(
    () => (all.data ? validSelection(stored, meals) : []),
    [all.data, stored, meals],
  )
  const picked = selected.length > 0
  const pick = useShopping(selected)
  const data = picked ? pick.data : all.data
  const [name, setName] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const flip = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  const check = useOptimisticMutation({
    fn: (a: { id: string; checked: boolean }) => api.setShoppingChecked(a.id, a.checked),
    key: ['shopping'],
    apply: (old: ShoppingLine[], a) =>
      old.map((l) => (l.id === a.id ? { ...l, checked: a.checked } : l)),
    fromResult: (lines) => lines,
    keys: [['shopping']],
  })
  const order = useOptimisticMutation({
    fn: (ids: string[]) => api.setShoppingOrder(ids),
    key: ['shopping'],
    apply: (old: ShoppingLine[], ids) => {
      const at = new Map(ids.map((id, i) => [id, i]))
      return [...old].sort((a, b) => (at.get(a.id) ?? 1e9) - (at.get(b.id) ?? 1e9))
    },
    fromResult: (lines) => lines,
  })
  const add = useOptimisticMutation({
    fn: (n: string) => api.addShoppingLine(n),
    key: ['shopping'],
    apply: (old: ShoppingLine[], n) => [
      ...old,
      {
        id: `pending:${n}`,
        name: n,
        need: '',
        checked: false,
        custom: true,
        meals: [],
        staple: false,
      },
    ],
    fromResult: (lines) => lines,
  })
  const del = useOptimisticMutation({
    fn: (id: string) => api.removeShoppingLine(id),
    key: ['shopping'],
    apply: (old: ShoppingLine[], id) => old.filter((l) => l.id !== id),
    fromResult: (lines) => lines,
  })
  const tick = (id: string, checked: boolean) => {
    // The picked view is cached under its own key; tick it too so it answers at once.
    qc.setQueriesData<ShoppingLine[]>({ queryKey: ['shopping'] }, (old) =>
      old?.map((l) => (l.id === id ? { ...l, checked } : l)),
    )
    check.mutate({ id, checked })
  }
  /** Drop `id` where `target` is in the whole list; the groups are views of that one order. */
  const moveOver = (id: string, target: string) => {
    const ids = moveBefore(
      (all.data ?? []).map((l) => l.id),
      id,
      target,
    )
    order.mutate(ids)
  }
  const submit = () => {
    if (!name.trim()) return
    add.mutate(name.trim())
    setName('')
  }
  const toggle = (id: string) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const view = useMemo(() => buildView(data ?? [], today, picked), [data, today, picked])
  const left = (data ?? []).filter((l) => !l.checked).length
  const rowProps = (l: ShoppingLine) => ({
    line: l,
    picked,
    onCheck: (c: boolean) => tick(l.id, c),
    onRemove: l.custom ? () => del.mutate(l.id) : undefined,
  })
  const section = (g: ShopGroup, reorder: boolean) => (
    <View key={g.key} style={styles.section}>
      <Text variant="label" accessibilityRole="header" style={styles.heading}>
        {g.title}
        {g.meals ? ` · ${g.meals}` : ''}
      </Text>
      <Lines lines={g.lines} reorder={reorder} rowProps={rowProps} onMove={moveOver} />
    </View>
  )

  return (
    <Screen title={SHOP.title}>
      {all.isLoading || !all.data ? (
        <Loading />
      ) : (
        <View style={styles.page}>
          <View style={styles.chips} accessibilityRole="menu">
            {meals.map((m) => (
              <Pill
                key={m.mealId}
                label={`${m.name} · ${m.count}`}
                selected={selected.includes(m.mealId)}
                onPress={() => toggle(m.mealId)}
              />
            ))}
            <Pill label={SHOP.useSoon} onPress={() => router.push('/use-soon' as Href)} />
          </View>

          {picked && pick.isLoading ? <Loading /> : null}
          {!picked && all.data.length === 0 ? <Empty>{SHOP.empty}</Empty> : null}
          {picked && pick.data && pick.data.length === 0 ? <Empty>{SHOP.nothing}</Empty> : null}
          {data && data.length > 0 ? (
            <Text variant="small">
              {left === 1 ? '1 to buy' : `${left} to buy`}
              {data.length - left > 0 ? `, ${data.length - left} in the cart` : ''}
            </Text>
          ) : null}

          {view.groups.map((g) => section(g, !picked))}

          {view.mine.length ? (
            <View style={styles.section}>
              <Text variant="label" accessibilityRole="header" style={styles.heading}>
                Added by you
              </Text>
              <Lines lines={view.mine} reorder={!picked} rowProps={rowProps} onMove={moveOver} />
            </View>
          ) : null}

          {view.pantry.length ? (
            <View style={styles.group}>
              <Fold
                open={!!open.pantry}
                onPress={() => flip('pantry')}
                label={SHOP.pantry}
                hint={pantrySummary(view.pantry)}
              />
              {open.pantry ? (
                <Lines lines={view.pantry} reorder={false} rowProps={rowProps} onMove={moveOver} />
              ) : null}
            </View>
          ) : null}

          {view.later ? (
            <View style={styles.group}>
              <Fold
                open={!!open.later}
                onPress={() => flip('later')}
                label="Later"
                hint={`${view.later.meals} · ${view.later.lines.length} items`}
              />
              {open.later ? (
                <Lines
                  lines={view.later.lines}
                  reorder={false}
                  rowProps={rowProps}
                  onMove={moveOver}
                />
              ) : null}
            </View>
          ) : null}

          {view.cart.length ? (
            <View style={styles.group}>
              <Fold
                open={!!open.cart}
                onPress={() => flip('cart')}
                label={`${SHOP.cart} (${view.cart.length})`}
              />
              {open.cart ? (
                <Lines lines={view.cart} reorder={false} rowProps={rowProps} onMove={moveOver} />
              ) : null}
            </View>
          ) : null}

          <View style={styles.add}>
            <View style={styles.addField}>
              <TextField
                label={SHOP.add}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Tin foil"
                onSubmitEditing={submit}
              />
            </View>
            <Button label="+ Add" disabled={!name.trim()} onPress={submit} />
          </View>
        </View>
      )}
    </Screen>
  )
}

/** A folded row: label, a hint, and a chevron that turns. */
function Fold({
  open,
  onPress,
  label,
  hint,
}: {
  open: boolean
  onPress: () => void
  label: string
  hint?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={[styles.fold, open && styles.sep]}
    >
      <Text style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? <Text variant="small">{`  ·  ${hint}`}</Text> : null}
      </Text>
      <Text color={colors.muted} style={[styles.chev, open && styles.chevOpen]}>
        {'›'}
      </Text>
    </Pressable>
  )
}

interface RowProps {
  line: ShoppingLine
  picked: boolean
  onCheck: (c: boolean) => void
  onRemove?: () => void
}

/** One white group of lines; the handle on each moves it within the group. */
function Lines({
  lines,
  reorder,
  rowProps,
  onMove,
}: {
  lines: ShoppingLine[]
  reorder: boolean
  rowProps: (l: ShoppingLine) => RowProps
  onMove: (id: string, target: string) => void
}) {
  return (
    <View style={styles.group}>
      {lines.map((l, i) => (
        <Line
          key={l.id}
          {...rowProps(l)}
          index={i}
          count={lines.length}
          last={i === lines.length - 1}
          onMoveTo={reorder ? (to) => onMove(l.id, lines[to].id) : undefined}
        />
      ))}
    </View>
  )
}

function Line({
  line,
  picked,
  index,
  count,
  last,
  onCheck,
  onMoveTo,
  onRemove,
}: RowProps & {
  index: number
  count: number
  last: boolean
  onMoveTo?: (to: number) => void
}) {
  const [dy, setDy] = useState<number | null>(null)
  const height = useRef(56)
  const latest = useRef({ index, count, onMoveTo })
  latest.current = { index, count, onMoveTo }
  const target = (d: number) => {
    const { index: i, count: n } = latest.current
    return Math.max(0, Math.min(n - 1, i + Math.round(d / height.current)))
  }
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => setDy(0),
      onPanResponderMove: (_, g) => setDy(g.dy),
      onPanResponderRelease: (_, g) => {
        setDy(null)
        const to = target(g.dy)
        if (to !== latest.current.index) latest.current.onMoveTo?.(to)
      },
      onPanResponderTerminate: () => setDy(null),
    }),
  ).current
  const dragging = dy !== null
  const why = forWhat(line, picked)
  const amount = amountText(line)
  return (
    <View
      style={[
        styles.row,
        !last && styles.sep,
        dragging && { transform: [{ translateY: dy }], zIndex: 10, backgroundColor: colors.subtle },
      ]}
      onLayout={(e) => {
        height.current = e.nativeEvent.layout.height
      }}
    >
      <Checkbox label={`Bought ${line.name}`} checked={line.checked} onChange={onCheck} />
      <View style={styles.main}>
        <Text style={[styles.name, line.checked && styles.done]}>
          {line.name}
          {amount ? <Text style={styles.amount}>{`  ·  ${amount}`}</Text> : null}
        </Text>
        {why ? <Text variant="small">{why}</Text> : null}
        {line.have ? <Text variant="small">{`You have ${line.have} to use up`}</Text> : null}
        {line.note ? <Badge label={line.note} tone="info" style={styles.note} /> : null}
      </View>
      {onRemove ? (
        <Button
          label="Remove"
          accessibilityLabel={`Remove ${line.name}`}
          variant="ghost"
          small
          onPress={onRemove}
        />
      ) : null}
      {onMoveTo ? (
        <View
          {...pan.panHandlers}
          accessibilityRole="button"
          accessibilityLabel={`Drag to reorder ${line.name}`}
          style={styles.handle}
        >
          <Text variant="bodyStrong" style={styles.grip}>
            ⠿
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { gap: space.sm },
  heading: { paddingHorizontal: space.xs },
  group: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  fold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 48,
  },
  chev: { fontSize: fontSize.xl },
  chevOpen: { transform: [{ rotate: '90deg' }] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingVertical: space.xs,
  },
  main: { flex: 1, gap: 2, paddingVertical: space.xs },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.ink,
  },
  amount: { fontFamily: fonts.body, color: colors.muted },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  note: { marginTop: 2 },
  handle: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object)
      : {}),
  },
  grip: { color: colors.muted },
  add: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', flexWrap: 'wrap' },
  addField: { flex: 1, minWidth: 200 },
})
