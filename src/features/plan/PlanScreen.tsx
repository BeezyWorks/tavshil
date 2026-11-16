import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Loading, Screen, useLayout } from '@/components'
import { useToday, useWeek } from '@/lib/api/hooks'
import type { ISODate, MealCard, RunSummary, WeekDay } from '@/lib/api/types'
import { planHref } from '@/lib/plan'
import { space } from '@/theme/tokens'

import { MealSheet, MealSide } from './MealPanel'
import { MonthView } from './MonthView'
import { PlanProvider, type Selection } from './PlanContext'
import { Rail } from './Rail'
import { WeekView } from './WeekView'

const isDate = (s?: string): s is ISODate => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

/**
 * The Plan tab: the week (or month), the tonight card and, when wide, a right rail or the open meal's panel.
 * URL: `/?week=YYYY-MM-DD&view=month`; `&edit=<mealId>` opens that meal in change mode (the recipe page's "Change").
 */
export function PlanScreen() {
  const params = useLocalSearchParams<{ week?: string; view?: string; edit?: string }>()
  const router = useRouter()
  const { wide } = useLayout()
  const week = isDate(params.week) ? params.week : undefined
  const month = params.view === 'month'
  const go = (o: { week?: ISODate; view?: 'week' | 'month' }) => router.replace(planHref(o) as Href)
  const today = useToday()
  const [selected, setSelected] = useState<Selection | null>(null)
  const weekQ = useWeek(week)

  // "Change" on a recipe page comes back here with the meal to change.
  useEffect(() => {
    if (!params.edit || !weekQ.data) return
    const meal = findMeal(weekQ.data.days, weekQ.data.runs, params.edit)
    router.setParams({ edit: undefined })
    if (meal) setSelected({ date: meal.date, slot: meal.slot, meal, change: true })
  }, [params.edit, weekQ.data, router])

  if (!today) return <Screen>{<Loading />}</Screen>
  return (
    <PlanProvider today={today} selected={selected} setSelected={setSelected}>
      <Screen>
        <View style={wide ? styles.row : undefined}>
          <View style={styles.main}>
            {month ? <MonthView anchor={week} go={go} /> : <WeekView week={week} go={go} />}
          </View>
          {wide && !month ? (
            selected ? (
              <MealSide
                key={`${selected.date}${selected.slot}${selected.meal?.id ?? ''}`}
                sel={selected}
              />
            ) : (
              <Rail today={today} />
            )
          ) : null}
        </View>
      </Screen>
      {selected && (!wide || month) ? (
        <MealSheet
          key={`${selected.date}${selected.slot}${selected.meal?.id ?? ''}`}
          sel={selected}
        />
      ) : null}
    </PlanProvider>
  )
}

function findMeal(days: WeekDay[], runs: RunSummary[], id: string): MealCard | null {
  for (const d of days) {
    const m = d.meals.find((x) => x.id === id)
    if (m) return m
  }
  for (const r of runs)
    for (const h of r.holyDays) for (const m of h.meals) if (m.id === id) return m
  return null
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  main: { flex: 1, minWidth: 0, gap: space.lg },
})
