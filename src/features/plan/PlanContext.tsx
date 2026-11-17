import { useRouter, type Href } from 'expo-router'
import React, { createContext, useContext, useMemo } from 'react'

import { useEnsureRunMeal } from '@/lib/api/hooks'
import type { DaySlot, ISODate, MealCard, WeekDay } from '@/lib/api/types'
import { hostedHref, wizardHref } from '@/lib/plan'

import { tapOf } from './model'

/** What the open meal panel is showing. */
export interface Selection {
  date: ISODate
  slot: DaySlot
  /** Null while the slot is empty. */
  meal: MealCard | null
  change: boolean
}

interface Ctx {
  today: ISODate
  selected: Selection | null
  /** A meal was tapped: its recipe, its hosted page, or the panel. */
  openMeal: (meal: MealCard) => void
  /** An empty slot (or the "+" of a day) was tapped. */
  addMeal: (date: ISODate, slot?: DaySlot) => void
  /** Friday night / erev Yom Tov: the evening belongs to the holy day. */
  openEve: (eve: NonNullable<WeekDay['eve']>) => void
  close: () => void
  setChange: (on: boolean) => void
}

const PlanCtx = createContext<Ctx | null>(null)
export const usePlanCtx = () => {
  const c = useContext(PlanCtx)
  if (!c) throw new Error('usePlanCtx outside the Plan screen')
  return c
}

/** The query that carries the meal into a recipe page: `?meal=…&date=…&slot=…&people=4`. */
export function recipeHref(recipeId: string, meal: MealCard): string {
  const q = new URLSearchParams({
    meal: meal.id ?? '',
    date: meal.date,
    slot: meal.slotLabel || meal.name,
    people: String(meal.headcount.total),
  })
  return `/recipes/${recipeId}?${q.toString()}`
}

export function PlanProvider({
  today,
  selected,
  setSelected,
  children,
}: {
  today: ISODate
  selected: Selection | null
  setSelected: (s: Selection | null) => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const ensure = useEnsureRunMeal()
  const value = useMemo<Ctx>(
    () => ({
      today,
      selected,
      openMeal: (meal) => {
        const tap = tapOf(meal)
        if (tap.kind === 'hosted') return router.push(hostedHref(tap.key) as Href)
        if (tap.kind === 'recipe') return router.push(recipeHref(tap.recipeId, meal) as Href)
        setSelected({ date: meal.date, slot: meal.slot, meal, change: !meal.dishes?.length })
      },
      addMeal: (date, slot = 'dinner') => setSelected({ date, slot, meal: null, change: false }),
      openEve: async (eve) => {
        if (eve.meal) return router.push(hostedHref(eve.meal.hostedKey) as Href)
        const r = await ensure.mutateAsync({
          runKey: eve.runKey,
          holyDate: eve.holyDate,
          part: 'night',
        })
        router.push(wizardHref(r.mealId) as Href)
      },
      close: () => setSelected(null),
      setChange: (on) => setSelected(selected ? { ...selected, change: on } : null),
    }),
    [today, selected, setSelected, router, ensure],
  )
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>
}
