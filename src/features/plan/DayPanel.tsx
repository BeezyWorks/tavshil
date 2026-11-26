import { type Href } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { usePantry, usePrep, useShopping } from '@/lib/api/hooks'
import type { ISODate, WeekDay } from '@/lib/api/types'
import { weekdayName } from '@/lib/dates'
import { PICKABLE_SLOTS } from '@/lib/plan'
import { PLAN } from '@/lib/strings'
import { useTabRouter } from '@/lib/tabRoute'
import { colors, fonts } from '@/theme/tokens'

import { mergeDays } from '../prep/model'
import { RestLine } from '../prep/TodoList'
import { AddTile, AddToDay, CloseButton, Section, SidePanel } from './MealPanel'
import { buyCounts, dayLabel } from './model'
import { usePlanCtx } from './PlanContext'
import { TaskItem } from './TaskItem'

/**
 * Wide: the panel beside the week when no meal is open. One day (today until another is clicked) as a timeline:
 * the prep done that day, in time order across its meals, with links into each recipe and cooking mode, then what
 * is left to buy. The meals themselves are in the week beside it; a meal's panel is organised by dish instead.
 */
export function DaySide({
  date,
  day,
}: {
  date: ISODate
  /** The day in the week shown, when it is in view. */
  day?: WeekDay
}) {
  const { today, selectDay } = usePlanCtx()
  const [adding, setAdding] = useState(false)
  useEffect(() => setAdding(false), [date])
  // Friday night and erev Yom Tov dinners belong to the holy day.
  const slots = day?.eve ? PICKABLE_SLOTS.filter((s) => s !== 'dinner') : PICKABLE_SLOTS
  const prep = usePrep()
  const pday = useMemo(
    () => mergeDays(prep.data ?? []).find((d) => d.date === date),
    [prep.data, date],
  )
  const isToday = date === today
  const candles = day?.candleLighting?.text
  const sub = [
    dayLabel(date),
    day?.hebrew ?? pday?.hebrew,
    candles && !pday?.rest ? `Candles ${candles}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <SidePanel
      title={isToday ? PLAN.today : weekdayName(date)}
      sub={sub}
      action={
        isToday ? undefined : (
          <CloseButton
            label={`Back to ${PLAN.today.toLowerCase()}`}
            onPress={() => selectDay(today)}
          />
        )
      }
    >
      {adding ? (
        <View style={styles.adding}>
          <View style={styles.addHead}>
            <Text style={styles.addTitle}>{PLAN.addDish}</Text>
            <CloseButton label={PLAN.close} onPress={() => setAdding(false)} />
          </View>
          <AddToDay
            key={date}
            date={date}
            meals={day?.meals ?? []}
            slots={slots}
            slot={day?.holyDay ? 'lunch' : 'dinner'}
            onDone={() => setAdding(false)}
          />
        </View>
      ) : (
        <AddTile onPress={() => setAdding(true)} />
      )}
      <Section title={PLAN.prep}>
        {pday?.tasks.length ? (
          pday.tasks.map((t) => <TaskItem key={t.id} task={t} />)
        ) : (
          <Text style={styles.small}>
            {prep.isLoading ? ' ' : (pday?.note ?? PLAN.nothingToPrep)}
          </Text>
        )}
        {pday?.rest ? <RestLine day={pday} /> : null}
      </Section>
      <ToBuy today={today} />
    </SidePanel>
  )
}

function ToBuy({ today }: { today: ISODate }) {
  const router = useTabRouter()
  const shopping = useShopping()
  const pantry = usePantry()
  const counts = buyCounts(shopping.data, today)
  const soon = (pantry.data?.items ?? []).filter((p) => p.expiringSoon && !p.expired)
  const first = soon[0]
  return (
    <Section
      title={PLAN.toBuy}
      link={{ label: `${PLAN.list} ›`, onPress: () => router.push('/shopping' as Href) }}
    >
      <Row label="Today" value={counts.today} />
      {counts.by ? (
        <Row label={`By ${weekdayName(counts.by.date)}`} value={counts.by.count} />
      ) : null}
      {first ? (
        <Text style={[styles.small, { color: colors.warn }]}>
          {`${first.quantity && first.quantity !== 'some' ? `${first.quantity} ` : ''}${first.name} to use${
            first.expires ? ` by ${weekdayName(first.expires, true)}` : ' soon'
          }${soon.length > 1 ? `, +${soon.length - 1} more` : ''}`}
        </Text>
      ) : null}
    </Section>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={[styles.rowText, { flex: 0, fontFamily: fonts.bodySemiBold }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  adding: { gap: 12 },
  addHead: { flexDirection: 'row', alignItems: 'center' },
  addTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row' },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
})
