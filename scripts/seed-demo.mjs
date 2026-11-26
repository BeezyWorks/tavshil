#!/usr/bin/env node
/**
 * Seeds a demo household for App Store screenshots and the App Review account: a few recipes with cooking timers,
 * two guest households (one needing chalav Yisrael, one allergic to eggs) and a Shabbat on the plan.
 *
 *   node scripts/seed-demo.mjs http://localhost:8787 dev-demo        (local worker, DEV_AUTH)
 *   node scripts/seed-demo.mjs https://tavshil.baderech.app <token>  (a signed-in session token for the review account)
 *
 * It adds data to whatever the account already has, so run it once on a fresh account. The Shabbat is the next one
 * on the household's calendar.
 */
const [base = 'http://localhost:8787', token = 'dev-demo'] = process.argv.slice(2)

async function call(method, path, body) {
  // A `tsk_…` API key works on /v1 only; session tokens (and dev-*) use /api.
  const prefix = token.startsWith('tsk_') ? '/v1' : '/api'
  const res = await fetch(`${base}${prefix}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`)
  return data
}

const ing = (text, extra = {}) => ({ text, ...extra })
const EGG = { allergens: ['egg'], flags: ['egg', 'animal_derived'], category: 'parve' }
const MILK = { allergens: ['milk'], category: 'dairy' }

const household = await call('GET', '/household')
await call('PATCH', `/people/${household.persons[0].id}`, { name: 'Miriam' })
await call('PATCH', '/household', {
  name: 'The Levin family',
  location: {
    lat: 40.8932,
    lng: -74.0116,
    timeZone: 'America/New_York',
    israel: false,
    name: 'Teaneck',
  },
})
for (const name of ['David']) await call('POST', '/people', { name })
await call('POST', '/people', { name: 'Noa', isChild: true, age: 7 })

// ---- Guests ----
const savta = await call('POST', '/people', {
  name: 'Savta Esther',
  newContactHousehold: 'Savta Esther',
})
const savtaHh = savta.householdId ?? savta.household?.id
await call('PUT', `/people/${savta.id ?? savta.personId}/constraints`, {
  add: [
    { tagType: 'kashrut_sourcing', tag: 'chalav_yisrael', kind: 'religious', severity: 'strict' },
  ],
})
const rivka = await call('POST', '/people', {
  name: 'Rivka Goldman',
  newContactHousehold: 'The Goldmans',
})
const rivkaHh = rivka.householdId ?? rivka.household?.id
await call('PUT', `/people/${rivka.id ?? rivka.personId}/constraints`, {
  add: [
    {
      tagType: 'allergen',
      tag: 'gluten',
      kind: 'medical',
      severity: 'strict',
      note: 'Celiac. Gluten free only.',
    },
  ],
})
const yossi = await call('POST', '/people', {
  name: 'Yossi Katz',
  newContactHousehold: 'Yossi Katz',
})
const yossiHh = yossi.householdId ?? yossi.household?.id
await call('PUT', `/people/${yossi.id ?? yossi.personId}/constraints`, {
  add: [{ tagType: 'diet', tag: 'vegetarian', kind: 'preference', severity: 'flexible' }],
})

// ---- Recipes ----
async function recipe(title, fields) {
  const r = await call('POST', '/recipes', { recipeTitle: title, ...fields })
  if (!recipe.shown) {
    recipe.shown = true
    console.error('recipe response shape:', JSON.stringify(r).slice(0, 300))
  }
  return r.versionId ?? r.version?.id ?? r.versions?.[0]?.id
}
const v = {}
v.challah = await recipe('Challah', {
  servings: 12,
  course: 'challah',
  category: 'parve',
  activeMinutes: 30,
  totalMinutes: 180,
  ingredients: [
    ing('7 cups flour'),
    ing('1 1/2 cups warm water'),
    ing('2 packets yeast'),
    ing('1/2 cup sugar'),
    ing('1/2 cup oil'),
    ing('3 eggs', { ingredient: EGG }),
    ing('1 tbsp salt'),
  ],
  steps: [
    { text: 'Mix the yeast with the warm water and sugar and let it foam.', uses: [1, 2, 3] },
    { text: 'Add the oil, eggs, salt and flour and knead until smooth.', uses: [0, 4, 5, 6] },
    {
      text: 'Cover the dough and let it rise until doubled.',
      timerMinutes: 60,
      timerLabel: 'Dough rises',
    },
    'Divide and braid the loaves, then brush with beaten egg.',
    { text: 'Bake until deep golden.', timerMinutes: 35, timerLabel: 'Bake challah' },
  ],
})
v.soup = await recipe('Chicken soup', {
  servings: 12,
  course: 'soup',
  category: 'meat',
  activeMinutes: 25,
  totalMinutes: 150,
  ingredients: [
    ing('1 whole chicken, cut up', { ingredient: { category: 'meat' } }),
    ing('4 carrots'),
    ing('3 celery stalks'),
    ing('2 onions'),
    ing('1 parsnip'),
    ing('1 bunch dill'),
    ing('2 tbsp salt'),
  ],
  steps: [
    'Put the chicken and vegetables in a large pot and cover with water.',
    { text: 'Bring to a boil, then skim the foam.', timerMinutes: 15, timerLabel: 'Skim' },
    { text: 'Simmer, partly covered.', timerMinutes: 90, timerLabel: 'Simmer soup' },
    'Add the dill, season and strain.',
  ],
})
v.chicken = await recipe('Silan roast chicken', {
  servings: 10,
  course: 'main',
  category: 'meat',
  activeMinutes: 20,
  totalMinutes: 100,
  ingredients: [
    ing('10 chicken thighs', { ingredient: { category: 'meat' } }),
    ing('1/3 cup silan (date honey)'),
    ing('3 tbsp olive oil'),
    ing('4 cloves garlic'),
    ing('2 tsp paprika'),
    ing('1 tsp salt'),
  ],
  steps: [
    {
      text: 'Whisk the silan, oil, garlic, paprika and salt and coat the chicken.',
      uses: [0, 1, 2, 3, 4, 5],
    },
    {
      text: 'Roast at 400°F until the skin is dark and glossy.',
      timerMinutes: 55,
      timerLabel: 'Roast chicken',
    },
    { text: 'Rest before serving.', timerMinutes: 10, timerLabel: 'Rest' },
  ],
})
v.kugel = await recipe('Potato kugel', {
  servings: 12,
  course: 'side',
  category: 'parve',
  activeMinutes: 25,
  totalMinutes: 90,
  ingredients: [
    ing('6 potatoes'),
    ing('2 onions'),
    ing('4 eggs', { ingredient: EGG }),
    ing('1/3 cup oil'),
    ing('1/4 cup flour'),
    ing('2 tsp salt'),
  ],
  steps: [
    'Grate the potatoes and onions and squeeze out the liquid.',
    'Mix with the eggs, oil, flour and salt.',
    { text: 'Bake at 400°F until crisp on top.', timerMinutes: 60, timerLabel: 'Bake kugel' },
  ],
})
v.salad = await recipe('Israeli salad', {
  servings: 10,
  course: 'salad',
  category: 'parve',
  activeMinutes: 15,
  totalMinutes: 15,
  ingredients: [
    ing('6 cucumbers'),
    ing('6 tomatoes'),
    ing('1 red onion'),
    ing('1/4 cup olive oil'),
    ing('2 lemons, juiced'),
    ing('1 tsp salt'),
  ],
  steps: ['Dice the vegetables.', 'Toss with the oil, lemon juice and salt just before serving.'],
})
v.fruit = await recipe('Poached pears', {
  servings: 10,
  course: 'dessert',
  category: 'parve',
  activeMinutes: 10,
  totalMinutes: 45,
  ingredients: [
    ing('6 pears'),
    ing('2 cups red wine'),
    ing('1/2 cup sugar'),
    ing('1 cinnamon stick'),
  ],
  steps: [
    'Peel the pears and set them in a pot with the wine, sugar and cinnamon.',
    { text: 'Poach gently, turning the pears once.', timerMinutes: 30, timerLabel: 'Poach pears' },
  ],
})
v.brownies = await recipe('Fudgy brownies', {
  servings: 16,
  course: 'dessert',
  category: 'parve',
  activeMinutes: 15,
  totalMinutes: 45,
  ingredients: [
    ing('1 cup margarine'),
    ing('1 1/2 cups sugar'),
    ing('3 eggs', { ingredient: EGG }),
    ing('3/4 cup cocoa'),
    ing('1 cup flour'),
  ],
  steps: [
    'Beat the margarine with the sugar and eggs.',
    'Fold in the cocoa and flour.',
    { text: 'Bake at 350°F.', timerMinutes: 28, timerLabel: 'Bake brownies' },
  ],
})
v.pasta = await recipe('Spinach cheese pasta bake', {
  servings: 8,
  course: 'main',
  category: 'dairy',
  activeMinutes: 20,
  totalMinutes: 55,
  ingredients: [
    ing('1 lb penne'),
    ing('10 oz spinach'),
    ing('2 cups ricotta', { ingredient: MILK }),
    ing('2 cups shredded mozzarella', { ingredient: MILK }),
    ing('2 cups marinara sauce'),
  ],
  steps: [
    'Cook the pasta and wilt the spinach.',
    'Mix everything with half the mozzarella and put it in a dish.',
    { text: 'Top with the rest and bake.', timerMinutes: 30, timerLabel: 'Bake pasta' },
  ],
})
v.cheesecake = await recipe('Lemon cheesecake', {
  servings: 12,
  course: 'dessert',
  category: 'dairy',
  activeMinutes: 20,
  totalMinutes: 300,
  ingredients: [
    ing('24 oz cream cheese', { ingredient: MILK }),
    ing('1 cup sugar'),
    ing('3 eggs', { ingredient: EGG }),
    ing('1/2 cup butter', { ingredient: MILK }),
    ing('1 1/2 cups graham crumbs'),
    ing('1 lemon, zested and juiced'),
  ],
  steps: [
    'Press the buttered crumbs into a springform pan.',
    'Beat the cream cheese, sugar, eggs and lemon and pour over the crust.',
    { text: 'Bake until just set.', timerMinutes: 50, timerLabel: 'Bake cheesecake' },
    { text: 'Chill before serving.', timerMinutes: 240, timerLabel: 'Chill' },
  ],
})

// ---- Shabbat ----
// The next Saturday (today, if it is one) is the Shabbat to plan. Override with HOLY_DATE / RUN_KEY (e.g. for Yom Tov).
const next = new Date()
next.setDate(next.getDate() + ((6 - next.getDay() + 7) % 7))
const saturday = next.toLocaleDateString('en-CA')
const run = {
  key: process.env.RUN_KEY ?? `run-${saturday}`,
  date: process.env.HOLY_DATE ?? saturday,
}
const night = await call('POST', '/hosted/ensure-meal', {
  runKey: run.key,
  holyDate: run.date,
  part: 'night',
})
const day = await call('POST', '/hosted/ensure-meal', {
  runKey: run.key,
  holyDate: run.date,
  part: 'day',
})
for (const m of [night, day]) {
  await call('POST', `/meals/${m.mealId}/households`, { householdId: savtaHh })
  await call('POST', `/meals/${m.mealId}/households`, { householdId: rivkaHh })
  await call('POST', `/meals/${m.mealId}/households`, { householdId: yossiHh })
}
const add = (m, course, versionId) =>
  call('POST', `/meals/${m.mealId}/dishes`, { course, versionId })
await add(night, 'starter', v.challah)
await add(night, 'starter', v.soup)
await add(night, 'main', v.chicken)
await add(night, 'side', v.kugel)
await add(night, 'side', v.salad)
await add(night, 'dessert', v.brownies)
await add(day, 'main', v.pasta)
await add(day, 'side', v.salad)
await add(day, 'dessert', v.cheesecake)
// Accepting the meals fills the shopping list (with the chalav Yisrael notes) and the prep schedule.
await call('POST', '/meals/accept', { mealIds: [night.mealId, day.mealId], force: true })
console.log(JSON.stringify({ night: night.mealId, day: day.mealId, vids: v, run }, null, 1))
