import { useRouter, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components'
import { usePantry, usePrep, useSetPrepDone, useShopping } from '@/lib/api/hooks'
import type { ISODate } from '@/lib/api/types'
import { weekdayName } from '@/lib/dates'
import { PLAN } from '@/lib/strings'
import { colors, fonts, space } from '@/theme/tokens'

import { buyCounts, nextTasks } from './model'

/** The wide right rail: the next three prep tasks (tickable) and what is left to buy. Plain lists under headings. */
export function Rail({ today }: { today: ISODate }) {
  return (
    <View style={styles.rail} accessibilityLabel="Coming up">
      <PrepNext today={today} />
      <View style={styles.rule} />
      <ToBuy today={today} />
    </View>
  )
}

function Heading({ title, link, href }: { title: string; link: string; href: string }) {
  const router = useRouter()
  return (
    <View style={styles.head}>
      <Text accessibilityRole="header" style={styles.h2}>
        {title}
      </Text>
      <Pressable accessibilityRole="link" onPress={() => router.push(href as Href)} hitSlop={8}>
        <Text style={styles.link}>{link}</Text>
      </Pressable>
    </View>
  )
}

function PrepNext({ today }: { today: ISODate }) {
  const prep = usePrep()
  const set = useSetPrepDone()
  const next = nextTasks(prep.data ?? [], today, 3)
  return (
    <View style={styles.section}>
      <Heading title={PLAN.prepNext} link={PLAN.all} href="/prep" />
      {next.length ? (
        next.map(({ task, when, date }) => (
          <Pressable
            key={task.id}
            accessibilityRole="checkbox"
            accessibilityLabel={task.text}
            accessibilityState={{ checked: task.done }}
            onPress={() => set.mutate([{ key: task.id, done: !task.done }])}
            style={styles.task}
          >
            <View style={[styles.ring, task.done && styles.ringOn]} />
            <View style={styles.grow}>
              <Text style={styles.taskText}>{task.text}</Text>
              <Text style={styles.small}>
                {[when, date !== today && task.mealName ? task.mealName : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <Text style={styles.small}>{prep.isLoading ? ' ' : 'Nothing to prep.'}</Text>
      )}
    </View>
  )
}

function ToBuy({ today }: { today: ISODate }) {
  const shopping = useShopping()
  const pantry = usePantry()
  const counts = buyCounts(shopping.data, today)
  const soon = (pantry.data?.items ?? []).filter((p) => p.expiringSoon && !p.expired)
  const first = soon[0]
  return (
    <View style={styles.section}>
      <Heading title={PLAN.toBuy} link={PLAN.list} href="/shopping" />
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
    </View>
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
  rail: { width: 260, flexShrink: 0, gap: 22, paddingTop: 74 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  section: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'baseline' },
  h2: { flex: 1, fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent },
  task: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ring,
    marginTop: 1,
  },
  ringOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  grow: { flex: 1, minWidth: 0 },
  taskText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row' },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
})
