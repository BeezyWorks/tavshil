import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { Loading, Screen, Segmented, useLayout } from '@/components'
import { PrepActions } from '@/features/prep/PrepActions'
import { TodoList } from '@/features/prep/TodoList'
import { useToday, useWeek } from '@/lib/api/hooks'
import type { ISODate, MealCard, RunSummary, WeekDay } from '@/lib/api/types'
import { PLAN } from '@/lib/strings'
import { space } from '@/theme/tokens'

import { DaySide } from './DayPanel'
import { MealSheet, MealSide } from './MealPanel'
import { MonthBody, monthHeader, monthRowCenter } from './MonthView'
import { PlanProvider, type Selection } from './PlanContext'
import { PlanHeader } from './PlanHeader'
import { TonightCard } from './TonightCard'
import { useWeekHeader, WeekBody } from './WeekView'
import { ZoomSwitch } from './ZoomSwitch'

const isDate = (s?: string): s is ISODate => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

/**
 * The Plan tab: two views of the same days. Meals by when they are served (the week or month, the tonight card)
 * and prep by when it is done. Wide, the prep is a panel beside the week: a day (today until another day's heading
 * is clicked) or the open meal. A phone switches between them with Meals | To do.
 * URL: `/?week=YYYY-MM-DD&view=month`; `&show=todo` (phone: the To do view, `&meal=<id>` narrows it; wide: `&day=`
 * picks the day beside the week); `&edit=<mealId>` opens that meal in change mode (the recipe page's "Change").
 */
export function PlanScreen() {
  const params = useLocalSearchParams<{
    week?: string
    view?: string
    edit?: string
    show?: string
    day?: string
    meal?: string
  }>()
  const router = useRouter()
  const { wide } = useLayout()
  const week = isDate(params.week) ? params.week : undefined
  const month = params.view === 'month'
  const todo = !wide && params.show === 'todo'
  // Paging and the toggle change the params in place, so the Plan tab stays one page.
  const go = (o: { week?: ISODate; view?: 'week' | 'month' }) =>
    router.setParams({ week: o.week, view: o.view === 'month' ? 'month' : undefined })
  const today = useToday()
  const [selected, setSelected] = useState<Selection | null>(null)
  const [pickedDay, setDay] = useState<ISODate | null>(null)
  const weekQ = useWeek(week)
  const weekHead = useWeekHeader(week)

  // A link to a day's prep ("Prep" on a hosted page) picks that day beside the week.
  useEffect(() => {
    if (!isDate(params.day)) return
    setDay(params.day)
    setSelected(null)
    router.setParams({ day: undefined })
  }, [params.day, router])

  // "Change" on a recipe page comes back here with the meal to change.
  useEffect(() => {
    if (!params.edit || !weekQ.data) return
    const meal = findMeal(weekQ.data.days, weekQ.data.runs, params.edit)
    router.setParams({ edit: undefined })
    if (meal) setSelected({ date: meal.date, slot: meal.slot, meal, change: true })
  }, [params.edit, weekQ.data, router])

  if (!today) return <Screen>{<Loading />}</Screen>
  // The day week ↔ month keeps in view: the week on screen, or today.
  const focus = week ?? today
  const day = pickedDay ?? today
  const weekDay = weekQ.data?.days.find((d) => d.date === day)
  return (
    <PlanProvider
      today={today}
      selected={selected}
      setSelected={setSelected}
      day={day}
      setDay={setDay}
    >
      <Screen
        top={
          wide ? undefined : (
            <Segmented
              options={[
                { value: 'meals', label: PLAN.meals },
                { value: 'todo', label: PLAN.todo },
              ]}
              value={todo ? 'todo' : 'meals'}
              onChange={(v) =>
                router.setParams({ show: v === 'todo' ? 'todo' : undefined, meal: undefined })
              }
            />
          )
        }
        title={todo ? PLAN.todo : undefined}
        actions={todo ? <PrepActions /> : undefined}
      >
        {todo ? (
          <TodoList meal={params.meal} />
        ) : (
          <View style={styles.stack}>
            <PlanHeader {...(month ? monthHeader(focus, today) : weekHead)} go={go} />
            <TonightCard />
            <View style={wide ? styles.row : undefined}>
              <View style={styles.main}>
                <ZoomSwitch
                  mode={month ? 'month' : 'week'}
                  origin={{ month: monthRowCenter(focus, !wide), week: wide ? 180 : 120 }}
                >
                  {month ? (
                    <MonthBody base={focus} today={today} go={go} />
                  ) : (
                    <WeekBody week={week} go={go} />
                  )}
                </ZoomSwitch>
              </View>
              {wide && !month ? (
                <Animated.View
                  entering={FadeIn.duration(360).delay(80)}
                  exiting={FadeOut.duration(200)}
                  style={styles.side}
                >
                  {selected ? (
                    <MealSide
                      key={`${selected.date}${selected.slot}${selected.meal?.id ?? ''}`}
                      sel={selected}
                    />
                  ) : (
                    <DaySide date={day} day={weekDay} />
                  )}
                </Animated.View>
              ) : null}
            </View>
          </View>
        )}
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
  stack: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  main: { flex: 1, minWidth: 0, gap: space.lg },
  side: { flexShrink: 0, alignSelf: 'flex-start', maxHeight: '100%' },
})
