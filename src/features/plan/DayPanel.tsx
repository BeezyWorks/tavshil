import { type Href } from 'expo-router'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { usePantry, usePrep, useShopping } from '@/lib/api/hooks'
import type { ISODate, MealCard, WeekDay } from '@/lib/api/types'
import { weekdayName } from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { useTabRouter } from '@/lib/tabRoute'
import { colors, fonts } from '@/theme/tokens'

import { mergeDays } from '../prep/model'
import { RestLine } from '../prep/TodoList'
import { CloseButton, Section, SidePanel } from './MealPanel'
import { buyCounts, dayLabel } from './model'
import { usePlanCtx } from './PlanContext'
import { PhoneMeal } from './Slots'
import { TaskItem } from './TaskItem'

/**
 * Wide: the panel beside the week when no meal is open. One day (today until another is clicked):
 * its meals, the prep done that day with links into each recipe and cooking mode, and what is left to buy.
 */
export function DaySide({
  date,
  day,
  meals,
}: {
  date: ISODate
  /** The day in the week shown, when it is in view. */
  day?: WeekDay
  meals: MealCard[]
}) {
  const { today, selectDay } = usePlanCtx()
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
      {meals.length ? (
        <View style={styles.meals}>
          {meals.map((m) => (
            <PhoneMeal key={m.id ?? `${m.date}-${m.slot}`} meal={m} />
          ))}
        </View>
      ) : null}
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
  meals: { gap: 8 },
  small: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row' },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
})
