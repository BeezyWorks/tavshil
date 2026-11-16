import { describe, expect, it } from 'vitest'

import { api, nextFriday, sign, tool } from './helpers'

const NY = { lat: 40.7128, lng: -74.006, timeZone: 'America/New_York', israel: false }

const nextDay = (d: string, n = 1) =>
  new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Friday night brisket (thawed the day before) and a salad with no times; the salad again for Shabbat lunch. */
async function setup(who: string) {
  await api(who, 'PATCH', '/household', { location: NY })
  const brisket = await api(
    who,
    'POST',
    '/recipes/import',
    {
      title: 'Brisket',
      course: 'main',
      category: 'meat',
      servings: 8,
      activeMinutes: 30,
      totalMinutes: 240,
      ingredients: ['2 kg brisket', '2 onions', '1 tsp salt'],
      steps: ['Braise.'],
      ingredientData: { brisket: { category: 'meat' } },
    },
    201,
  )
  const salad = await api(
    who,
    'POST',
    '/recipes/import',
    {
      title: 'Onion salad',
      course: 'salad',
      category: 'parve',
      servings: 6,
      ingredients: ['2 onions', '1 tbsp olive oil'],
      steps: ['Slice and dress.'],
    },
    201,
  )
  // Import takes no prep details; they are edits on the version.
  await api(who, 'PUT', `/versions/${brisket.version.id}`, {
    holdsOnBlech: true,
    prePrep: [{ step: 'Thaw the brisket', leadMinutes: 1440 }],
  })
  await api(who, 'PUT', `/versions/${salad.version.id}`, { servingStyle: 'cold' })
  const friday = await nextFriday(who)
  const saturday = nextDay(friday)
  const dinner = await api(
    who,
    'POST',
    '/meals',
    {
      date: friday,
      name: 'Friday night',
      time: '19:00',
      items: [{ versionId: brisket.version.id }, { versionId: salad.version.id }],
    },
    201,
  )
  const lunch = await api(
    who,
    'POST',
    '/meals',
    {
      date: saturday,
      slot: 'lunch',
      name: 'Shabbat lunch',
      items: [{ versionId: salad.version.id }],
    },
    201,
  )
  return { brisket, salad, friday, saturday, dinner, lunch }
}

describe('prep schedule', () => {
  it('carries each task’s meal, recipe and key, the guessed times, and the cut-off before Shabbat', async () => {
    const who = 'prep-1'
    const { brisket, salad, friday, dinner } = await setup(who)
    const prep = await api(who, 'GET', '/prep')
    // No accepting: both meals are on the schedule as soon as they have dishes.
    expect(prep.mealCount).toBe(2)
    const tasks = prep.days.flatMap((d: any) => d.tasks)
    const itemOf = (title: string) => dinner.meal.items.find((i: any) => i.title === title).id

    const cook = tasks.find((t: any) => t.label === 'Cook Brisket')
    expect(cook).toMatchObject({
      key: `${dinner.meal.id}:${itemOf('Brisket')}:cook`,
      mealId: dinner.meal.id,
      mealLabel: 'Friday night',
      mealDate: friday,
      mealTimeText: '19:00',
      dish: 'Brisket',
      dishId: itemOf('Brisket'),
      recipeId: brisket.version.recipeId,
      versionId: brisket.version.id,
      guessedTimes: false,
      done: false,
    })
    // The thaw starts a day ahead.
    const thaw = tasks.find((t: any) => /thaw/i.test(t.label) && t.kind === 'active')
    expect(thaw.key).toBe(`${dinner.meal.id}:${itemOf('Brisket')}:pre:thaw-the-brisket`)
    expect(thaw.date < friday).toBe(true)

    // The salad has no times, so 30 minutes was assumed, per dish.
    const make = tasks.find(
      (t: any) => t.label === 'Make Onion salad' && t.mealId === dinner.meal.id,
    )
    expect(make).toMatchObject({ guessedTimes: true, versionId: salad.version.id })
    const dish = prep.dishes.find((d: any) => d.itemId === itemOf('Onion salad'))
    expect(dish).toMatchObject({ guessedTimes: true, recipeId: salad.version.recipeId })
    expect(dish.assumptions[0]).toMatch(/30 minutes/)

    // Erev Shabbat: when hands-on cooking ends, and the Shabbat block that follows.
    const fri = prep.days.find((d: any) => d.date === friday)
    expect(fri.rest).toMatchObject({ kind: 'shabbat', label: 'Shabbat', endsDate: nextDay(friday) })
    expect(fri.rest.handsOnEndsAt).toBe(fri.rest.startsAt - 20)
    expect(fri.rest.startsAtText).toBe(fri.candleLightingText)
    expect(fri.rest.endsAtText).toMatch(/^\d\d:\d\d$/)
    expect(fri.restDay).toBe(false)
    expect(prep.days.find((d: any) => d.date === nextDay(friday)).restDay).toBe(true)

    // Only some meals.
    const one = await api(who, 'GET', `/prep?mealIds=${dinner.meal.id}`)
    expect(one.mealCount).toBe(1)
  })

  it('ticks tasks off and back on over REST and MCP, and keeps the marks across reads', async () => {
    const who = 'prep-2'
    const { dinner } = await setup(who)
    const tasks = (await api(who, 'GET', '/prep')).days.flatMap((d: any) => d.tasks)
    const cook = tasks.find((t: any) => t.label === 'Cook Brisket')
    const blech = tasks.find((t: any) => t.key.startsWith('blech:'))
    expect(blech).toBeTruthy()

    await api(who, 'POST', '/prep/done', {
      marks: [
        { key: cook.key, done: true },
        { key: blech.key, done: true },
      ],
    })
    let prep = await api(who, 'GET', '/prep')
    let again = prep.days.flatMap((d: any) => d.tasks)
    expect(again.find((t: any) => t.key === cook.key)).toMatchObject({ done: true })
    expect(again.find((t: any) => t.key === blech.key).done).toBe(true)
    expect(again.find((t: any) => t.key === cook.key).doneAt).toBeGreaterThan(0)
    expect(prep.doneCount).toBe(2)

    // Editing the meal keeps the marks of tasks that still exist (keys do not depend on position).
    await api(who, 'PATCH', `/meals/${dinner.meal.id}`, { time: '19:30' })
    again = (await api(who, 'GET', '/prep')).days.flatMap((d: any) => d.tasks)
    expect(again.find((t: any) => t.key === cook.key).done).toBe(true)

    // The AI unticks it.
    const token = await sign(who)
    const r = await tool(token, 'mark_prep_done', { marks: [{ key: cook.key, done: false }] })
    expect(r.isError).toBe(false)
    prep = await api(who, 'GET', '/prep')
    again = prep.days.flatMap((d: any) => d.tasks)
    expect(again.find((t: any) => t.key === cook.key).done).toBe(false)
    expect(prep.doneCount).toBe(1)
    // And ticks it again (a removed mark comes back).
    await api(who, 'POST', '/prep/done', { marks: [{ key: cook.key, done: true }] })
    again = (await api(who, 'GET', '/prep')).days.flatMap((d: any) => d.tasks)
    expect(again.find((t: any) => t.key === cook.key).done).toBe(true)

    // Another household cannot mark this meal's tasks.
    await api('prep-other', 'POST', '/prep/done', { marks: [{ key: cook.key, done: true }] }, 404)
    await api(who, 'POST', '/prep/done', { marks: [{ key: 'nonsense', done: true }] }, 400)
  })
})

describe('shopping lines', () => {
  it('say which meals and dishes need each line, how much, by when, and whether it is a staple', async () => {
    const who = 'shop-meals'
    const { friday, saturday, dinner, lunch } = await setup(who)
    const list = await api(who, 'GET', '/shopping')
    const line = (re: RegExp) => list.lines.find((l: any) => re.test(l.name))

    const brisket = line(/brisket/i)
    expect(brisket.meals).toEqual([
      expect.objectContaining({
        mealId: dinner.meal.id,
        name: 'Friday night',
        date: friday,
        dishes: ['Brisket'],
        selected: true,
      }),
    ])
    expect(brisket.meals[0].amount).toBeTruthy()
    // The brisket thaws the day before, so it has to be bought before Friday.
    expect(brisket.buyBy < friday).toBe(true)
    expect(brisket.staple).toBe(false)
    expect(brisket.total).toBeNull()

    const onions = line(/onion/i)
    expect(onions.meals.map((m: any) => m.mealId)).toEqual([dinner.meal.id, lunch.meal.id])
    expect(onions.meals[0].dishes).toEqual(['Brisket', 'Onion salad'])
    expect(onions.meals[1]).toMatchObject({ date: saturday, dishes: ['Onion salad'] })
    expect(onions.needed[0].amount).toBe(6)
    // Needed for the brisket, which starts with the thaw.
    expect(onions.buyBy).toBe(brisket.buyBy)

    // Pantry staples by name: salt and olive oil.
    expect(line(/salt/i).staple).toBe(true)
    expect(line(/olive oil/i).staple).toBe(true)
    expect(line(/olive oil/i).buyBy).toBe(friday)

    // A household can say otherwise.
    await api(who, 'PATCH', `/ingredients/${line(/olive oil/i).ingredientId}`, { staple: false })
    await api(who, 'PATCH', `/ingredients/${brisket.ingredientId}`, { staple: true })
    const after = await api(who, 'GET', '/shopping')
    expect(after.lines.find((l: any) => /olive oil/i.test(l.name)).staple).toBe(false)
    expect(after.lines.find((l: any) => /brisket/i.test(l.name)).staple).toBe(true)
  })

  it('filters to some meals: their amounts, with the total across every meal', async () => {
    const who = 'shop-filter'
    const { saturday, dinner, lunch } = await setup(who)
    await api(who, 'PATCH', '/shopping', { addManual: ['paper towels'] })
    const all = await api(who, 'GET', '/shopping')
    expect(all.mealIds).toBeNull()
    expect(all.meals.map((m: any) => m.id)).toEqual([dinner.meal.id, lunch.meal.id])
    expect(all.lines.some((l: any) => l.manual)).toBe(true)

    const only = await api(who, 'GET', `/shopping?mealIds=${lunch.meal.id}`)
    expect(only.mealIds).toEqual([lunch.meal.id])
    expect(only.mealCount).toBe(1)
    expect(only.lines.some((l: any) => /brisket/i.test(l.name))).toBe(false)
    expect(only.lines.some((l: any) => l.manual)).toBe(false)
    const onions = only.lines.find((l: any) => /onion/i.test(l.name))
    expect(onions.needed[0].amount).toBe(2)
    expect(onions.total).toMatchObject({ mealCount: 2 })
    expect(onions.total.needed[0].amount).toBe(6)
    expect(onions.meals.map((m: any) => [m.mealId, m.selected])).toEqual([
      [dinner.meal.id, false],
      [lunch.meal.id, true],
    ])
    // The cold salad for Shabbat lunch is made before Shabbat, so it is needed on Friday.
    expect(onions.buyBy).toBe(nextDay(saturday, -1))

    // Both meals: the whole amount, nothing shared beyond the filter.
    const both = await api(who, 'GET', `/shopping?mealIds=${lunch.meal.id},${dinner.meal.id}`)
    expect(both.lines.find((l: any) => /onion/i.test(l.name)).total).toBeNull()

    // A meal outside the default range still counts when asked for by id; an unknown id is not found.
    const far = await api(
      who,
      'POST',
      '/meals',
      {
        date: nextDay(saturday, 60),
        name: 'Far dinner',
        items: [{ versionId: dinner.meal.items[1].versionId }],
      },
      201,
    )
    const farList = await api(who, 'GET', `/shopping?mealIds=${far.meal.id}`)
    expect(farList.lines.find((l: any) => /onion/i.test(l.name)).needed[0].amount).toBe(2)
    await api('shop-filter-other', 'GET', `/shopping?mealIds=${far.meal.id}`, undefined, 404)
  })
})
