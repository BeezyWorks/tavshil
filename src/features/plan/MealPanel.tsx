import { useRouter, type Href } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { RecipePicker, Text } from '@/components'
import { Icon } from '@/components/Icon'
import {
  useAddMealDish,
  useCreatePlanMeal,
  useDeletePlanMeal,
  useHostedMeal,
  usePrep,
  useRecipes,
  useRemoveMealDish,
  useShopping,
} from '@/lib/api/hooks'
import type { DaySlot, Id, MealCard, MealDish } from '@/lib/api/types'
import { addDays, clock12, weekdayName } from '@/lib/dates'
import { PICKABLE_SLOTS, SLOT_LABEL } from '@/lib/plan'
import { COURSE_LABEL, KIND_LABEL, PLAN } from '@/lib/strings'
import { colors, fonts, radius, space } from '@/theme/tokens'

import { buyLine, cookedLately, dayLabel, lastMade, mealShopping, slotName } from './model'
import { DayActions } from './DayActions'
import { recipeHref, usePlanCtx, type Selection } from './PlanContext'
import { Sheet } from './Sheet'
import { ProblemLine } from './Slots'

/** `Tomorrow · 7:00 pm · Us · 4`: where the meal sits and who eats. */
function subtitle(sel: Selection, today: string): string {
  const m = sel.meal
  const when =
    sel.date === today
      ? 'Today'
      : sel.date === addDays(today, 1)
        ? 'Tomorrow'
        : weekdayName(sel.date)
  const time = m?.timeText ? clock12(m.timeText).toLowerCase() : ''
  const people = m?.headcount.total ? `${m.hosted ? '' : 'Us · '}${m.headcount.total}` : ''
  return [when, time, people].filter(Boolean).join(' · ')
}

function heading(sel: Selection, today: string): { title: string; sub?: string } {
  const slot = sel.meal ? slotName(sel.meal) : SLOT_LABEL[sel.slot]
  if (sel.meal && sel.change)
    return {
      title: `Change ${slot.toLowerCase()}, ${dayLabel(sel.date)}`,
      sub: subtitle(sel, today),
    }
  return {
    title: `${slot}, ${dayLabel(sel.date)}`,
    sub: sel.meal ? subtitle(sel, today) : undefined,
  }
}

/** Phone: a bottom sheet over the week. */
export function MealSheet({ sel }: { sel: Selection }) {
  const { close, setChange, today } = usePlanCtx()
  const h = heading(sel, today)
  const changing = !!sel.meal && sel.change
  return (
    <Sheet
      title={h.title}
      subtitle={h.sub}
      onClose={close}
      action={
        changing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setChange(false)}
            style={styles.done}
          >
            <Text style={styles.link}>{PLAN.done}</Text>
          </Pressable>
        ) : undefined
      }
    >
      <PanelBody sel={sel} />
    </Sheet>
  )
}

/** Wide: a panel beside the week (the week stays visible). */
export function MealSide({ sel }: { sel: Selection }) {
  const { close, setChange, today } = usePlanCtx()
  const h = heading(sel, today)
  const changing = !!sel.meal && sel.change
  return (
    <View style={styles.side} accessibilityLabel={h.title}>
      <View style={styles.sideHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={styles.sideTitle}>
            {h.title}
          </Text>
          {h.sub ? <Text style={styles.sub}>{h.sub}</Text> : null}
        </View>
        {changing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setChange(false)}
            style={styles.done}
          >
            <Text style={styles.link}>{PLAN.done}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PLAN.close}
            onPress={close}
            style={styles.x}
          >
            <Text style={{ fontSize: 16, color: colors.muted }}>{'✕'}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PanelBody sel={sel} />
      </ScrollView>
    </View>
  )
}

function PanelBody({ sel }: { sel: Selection }) {
  if (!sel.meal) return <EmptySlot sel={sel} />
  return sel.change ? <ChangeMeal meal={sel.meal} /> : <MealView meal={sel.meal} />
}

/** The meal's dishes, from the freshest source: the loaded meal once there is one, else the card. */
function useDishes(meal: MealCard): MealDish[] {
  const hm = useHostedMeal(meal.id ?? undefined)
  if (hm.data)
    return hm.data.menu.flatMap((c) =>
      c.items.map((i) => ({
        itemId: i.itemId,
        title: i.title,
        course: i.course,
        recipeId: i.recipeId,
        versionId: i.versionId,
      })),
    )
  return meal.dishes
}

function DishRow({ dish, meal }: { dish: MealDish; meal: MealCard }) {
  const router = useRouter()
  const { close } = usePlanCtx()
  const sub = [
    dish.course ? (COURSE_LABEL[dish.course] ?? dish.course) : '',
    dish.recipeId ? '' : PLAN.noRecipe,
  ]
    .filter(Boolean)
    .join(' · ')
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.dishTitle}>{dish.title}</Text>
        {sub ? <Text style={styles.dishSub}>{sub}</Text> : null}
      </View>
      {dish.recipeId ? <Text style={styles.chevron}>{'›'}</Text> : null}
    </>
  )
  if (!dish.recipeId) return <View style={[styles.dish, styles.dishPlain]}>{body}</View>
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open recipe: ${dish.title}`}
      onPress={() => {
        close()
        router.push(recipeHref(dish.recipeId!, meal) as Href)
      }}
      style={styles.dish}
    >
      {body}
    </Pressable>
  )
}

function MealView({ meal }: { meal: MealCard }) {
  const router = useRouter()
  const { setChange, today } = usePlanCtx()
  const dishes = useDishes(meal)
  const prep = usePrep()
  const shopping = useShopping()
  const tasks = (prep.data ?? [])
    .flatMap((d) => d.tasks)
    .filter((t) => t.mealId === meal.id && !t.done)
    .slice(0, 5)
  const buy = meal.id ? mealShopping(shopping.data, meal.id) : { items: [], buyBy: null }
  return (
    <>
      <View style={styles.list}>
        {dishes.map((d) => (
          <DishRow key={d.itemId} dish={d} meal={meal} />
        ))}
      </View>
      <ProblemLine allergies={meal.problems.allergies} gaps={meal.problems.gaps} />
      {tasks.length ? (
        <Section title={PLAN.prep}>
          {tasks.map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Text style={styles.taskTime}>{t.time.toLowerCase()}</Text>
              <Text style={styles.taskText}>{t.text}</Text>
            </View>
          ))}
        </Section>
      ) : null}
      {buy.items.length ? (
        <Section
          title={
            buy.buyBy && buy.buyBy > today
              ? `To buy by ${weekdayName(buy.buyBy)}`
              : PLAN.toBuy + (buy.buyBy ? ' today' : '')
          }
          link={{ label: `${PLAN.list} ›`, onPress: () => router.push('/shopping' as Href) }}
        >
          <Text style={styles.buy}>{buyLine(buy.items)}</Text>
        </Section>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setChange(true)} style={styles.change}>
        <Text style={styles.link}>{PLAN.changeDinner}</Text>
      </Pressable>
    </>
  )
}

function Section({
  title,
  link,
  children,
}: {
  title: string
  link?: { label: string; onPress: () => void }
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title.toUpperCase()}
        </Text>
        {link ? (
          <Pressable accessibilityRole="link" onPress={link.onPress} hitSlop={8}>
            <Text style={[styles.link, { fontSize: 14 }]}>{link.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  )
}

/** Dishes with remove buttons, "Add a dish" (closed until tapped) and "Remove this dinner". */
function ChangeMeal({ meal }: { meal: MealCard }) {
  const { close, setChange } = usePlanCtx()
  const dishes = useDishes(meal)
  const add = useAddMealDish()
  const remove = useRemoveMealDish()
  const del = useDeletePlanMeal()
  const [open, setOpen] = useState(!dishes.length)
  const [error, setError] = useState('')
  const mealId = meal.id as Id
  const run = async (fn: () => Promise<unknown>) => {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const addDish = (dish: { versionId?: Id; description?: string }) =>
    run(async () => {
      await add.mutateAsync({ mealId, dish: { course: 'main', ...dish } })
      setOpen(false)
    })
  return (
    <>
      <View style={styles.list}>
        {dishes.map((d) => (
          <View key={d.itemId} style={[styles.dish, styles.dishChange]}>
            <Text style={[styles.dishTitle, { flex: 1 }]}>{d.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${d.title}`}
              onPress={() => run(() => remove.mutateAsync({ mealId, itemId: d.itemId }))}
              style={styles.trash}
            >
              <Icon name="trash" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.fieldLabel}>{PLAN.addDish}</Text>
        {open ? (
          <RecipePicker
            mealId={mealId}
            showListWhenEmpty={false}
            placeholder={PLAN.addDishPlaceholder}
            onPick={(hit) => addDish({ versionId: hit.versionId })}
            onAddWithoutRecipe={(t) => addDish({ description: t })}
            autoFocus
          />
        ) : (
          <ClosedSearch onPress={() => setOpen(true)} />
        )}
      </View>
      {error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            run(async () => {
              await del.mutateAsync(mealId)
              close()
            })
          }
          style={styles.change}
        >
          <Text style={[styles.link, { color: colors.danger }]}>{PLAN.removeDinner}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setChange(false)}
          style={styles.doneBtn}
        >
          <Text style={styles.doneBtnText}>{PLAN.done}</Text>
        </Pressable>
      </View>
    </>
  )
}

/** A search field that is only a button until tapped, so the keyboard stays down. */
function ClosedSearch({ onPress, label }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={label ?? PLAN.addDishPlaceholder}
      onPress={onPress}
      style={styles.search}
    >
      <Text color={colors.muted}>{'⌕'}</Text>
      <Text color={colors.muted} style={{ flex: 1 }}>
        {PLAN.addDishPlaceholder}
      </Text>
    </Pressable>
  )
}

/** An empty slot: the kind of meal, recipes cooked lately (one tap adds), and a search that starts unfocused. */
function EmptySlot({ sel }: { sel: Selection }) {
  const { close, today } = usePlanCtx()
  const [slot, setSlot] = useState<DaySlot>(sel.slot)
  const [error, setError] = useState('')
  const [host, setHost] = useState(false)
  const recipes = useRecipes('', {})
  const create = useCreatePlanMeal()
  const add = useAddMealDish()
  const lately = cookedLately(
    (recipes.data ?? []).filter((r) => r.course === 'main'),
    5,
  )
  const addDish = async (dish: { versionId?: Id; description?: string }) => {
    setError('')
    try {
      const m = await create.mutateAsync({ date: sel.date, slot })
      await add.mutateAsync({ mealId: m.id as Id, dish: { course: 'main', ...dish } })
      close()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <>
      <View style={styles.pills}>
        {PICKABLE_SLOTS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: s === slot }}
            onPress={() => setSlot(s)}
            style={[styles.pill, s === slot && styles.pillOn]}
          >
            <Text style={[styles.pillText, s === slot && { color: colors.onAccent }]}>
              {SLOT_LABEL[s]}
            </Text>
          </Pressable>
        ))}
      </View>
      {lately.length ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>{PLAN.cookedLately}</Text>
          {lately.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${r.title}`}
              onPress={() => addDish({ versionId: r.defaultVersionId })}
              style={[styles.dish, styles.dishChange]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.dishTitle}>{r.title}</Text>
                <Text style={styles.dishSub}>
                  {[r.kinds[0] ? KIND_LABEL[r.kinds[0]] : '', lastMade(r.lastServed, today)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Icon name="plus" size={20} color={colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Text style={styles.fieldLabel}>{PLAN.somethingElse}</Text>
        <RecipePicker
          showListWhenEmpty={false}
          placeholder={PLAN.addDishPlaceholder}
          onPick={(hit) => addDish({ versionId: hit.versionId })}
          onAddWithoutRecipe={(t) => addDish({ description: t })}
          autoFocus={false}
        />
      </View>
      {error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setHost(true)} style={styles.change}>
        <Text style={styles.link}>{PLAN.hostAMeal}</Text>
      </Pressable>
      {host ? (
        <DayActions
          date={sel.date}
          onClose={() => {
            setHost(false)
            close()
          }}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  side: {
    width: 400,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.group,
    padding: space.xl,
    gap: space.lg,
    alignSelf: 'flex-start',
    maxHeight: '100%',
  },
  sideHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sideTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  body: { gap: space.lg },
  x: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center' },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.accent },
  list: { gap: 8 },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.subtle,
    borderRadius: radius.tile,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  dishPlain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  dishChange: { paddingVertical: 4, paddingRight: 4 },
  dishTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.ink },
  dishSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  chevron: { fontSize: 22, color: colors.muted },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: {
    gap: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  taskRow: { flexDirection: 'row', gap: 10 },
  taskTime: { width: 64, fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  taskText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  buy: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  change: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.input,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  doneBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onAccent },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.subtle,
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: colors.accent },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
})
