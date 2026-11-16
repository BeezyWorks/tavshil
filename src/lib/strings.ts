/** UI strings in one place so other languages can be added later. */
export const DISCLAIMER =
  'Tavshil helps you check, but it can’t guarantee a dish is safe. Confirm allergies with your guests.'

export const KIND_LABEL = { meat: 'Meat', dairy: 'Dairy', parve: 'Parve' } as const

export const COURSE_LABEL: Record<string, string> = {
  main: 'Main',
  side: 'Side',
  salad: 'Salad',
  soup: 'Soup',
  starter: 'Starter',
  challah: 'Challah',
  dessert: 'Dessert',
  other: 'Other',
}

/** Version names that mean "the only one": not worth repeating next to the dish name. */
const PLAIN_VERSION = new Set(['', 'classic', 'original', 'default'])

/**
 * A dish with its version, without nesting parentheses: "Brownies (Fudgy)", but
 * "Potato kugel: Pesach (potato starch)" when the version name already has brackets.
 */
export function dishName(title: string, version?: string | null): string {
  const v = (version ?? '').trim()
  if (PLAIN_VERSION.has(v.toLowerCase()) || v.toLowerCase() === title.trim().toLowerCase())
    return title
  return v.includes('(') ? `${title}: ${v}` : `${title} (${v})`
}

/** The app's sections. The tabs and the web nav pick from these. */
export const NAV = {
  plan: { href: '/', label: 'Plan' },
  shopping: { href: '/shopping', label: 'Shopping' },
  prep: { href: '/prep', label: 'Prep' },
  recipes: { href: '/recipes', label: 'Recipes' },
  people: { href: '/people', label: 'People' },
  more: { href: '/more', label: 'More' },
} as const

/** The web gear menu and the More screen. */
export const NAV_MENU = {
  title: 'Settings, kitchen and about',
  people: {
    href: '/people',
    label: 'People',
    subtitle: 'Your household, guests and what each can eat',
  },
  kitchen: {
    href: '/kitchen',
    label: 'Kitchen',
    subtitle: 'Pots, pans and appliances, and what each is kept for',
  },
  settings: {
    href: '/settings',
    label: 'Settings',
    subtitle: 'Household, units, API keys and connecting your AI',
  },
  about: {
    href: '/about',
    label: 'About and support',
    subtitle: 'Contact us, the privacy policy and deleting your account',
  },
} as const

export const NEXT_PREP = 'Next prep'

/** The Prep screen. */
export const PREP = {
  title: 'Prep',
  empty: 'Add dishes to a meal and its prep appears here, worked back from when you serve.',
  nothing: 'Nothing to prep for this pick.',
  pick: 'Pick one or more meals. None picked shows everything.',
  everything: 'Everything coming up',
  left: (n: number) => (n === 1 ? '1 task left' : `${n} tasks left`),
  passive: 'Passive',
  sitsUntil: (t: string) => `Passive · until ${t}`,
  guessed: '30 min guessed · Add times',
  cook: 'Cooking mode',
} as const

/** The Shopping screen. */
export const SHOP = {
  title: 'Shopping',
  useSoon: 'Use soon',
  empty:
    'Nothing to buy yet. Add dishes to a meal and its ingredients appear here, or add your own.',
  nothing: 'Nothing to buy for this pick.',
  pantry: 'Probably in the pantry',
  cart: 'In the cart',
  add: 'Add something',
} as const

/** The Plan page and the dinner flow. */
export const PLAN = {
  thisWeek: 'This week',
  tonight: 'Tonight',
  cook: 'Cook',
  addDinner: 'Add dinner',
  addDinnerHint: 'Nothing planned for tonight yet',
  addMeal: '+ Meal',
  add: 'Add',
  prepNext: 'Prep next',
  all: 'All',
  toBuy: 'To buy',
  list: 'List',
  change: 'Change',
  changeDinner: 'Change dinner',
  done: 'Done',
  close: 'Close',
  addDish: 'Add a dish',
  addDishPlaceholder: 'Search your recipes or type a dish',
  removeDinner: 'Remove this dinner',
  cookedLately: 'Cooked lately',
  somethingElse: 'Something else',
  prep: 'Prep',
  noRecipe: 'No recipe',
  hostAMeal: 'Host a meal…',
} as const

export const USE_SOON_LINK = {
  label: 'Use soon',
  subtitle: 'What to use up before it goes bad',
  href: '/use-soon',
}

export const REMINDERS = {
  title: 'Prep reminders',
  settingsHint: 'A nudge for the prep that has to start early. On this phone only.',
  prePrep: 'Thaw, marinate, soak, rise',
  prePrepHint: 'Things you’d forget. Recommended.',
  cooking: 'Start cooking',
  cookingHint: '“Start the kugel by 2:00 pm”',
  lead: 'Remind me',
  leadLabel: { 0: 'At the time', 15: '15 min before', 30: '30 min before', 60: '60 min before' },
  restTitle: 'Never on Shabbat or Yom Tov',
  restBody:
    'Nothing rings once candles are lit. A reminder that would fall then comes earlier instead, before candle lighting.',
  footnote:
    'Reminders are set on this phone. They update whenever the plan changes and the app is opened.',
  denied:
    'Notifications are off for Tavshil. Turn them on in your phone’s Settings to get reminders.',
} as const

export interface QuickConstraint {
  key: string
  label: string
  tagType: 'allergen' | 'diet' | 'kashrut-sourcing'
  tag: string
  kind: 'medical' | 'religious' | 'preference'
  severity: 'strict' | 'flexible'
}

/**
 * One-tap picks for "can't eat" when adding people. Allergies are strict (the dish can't be at the meal); diets
 * are flexible (they eat around it); sourcing standards are strict. Anything finer is set on the person page.
 */
export const QUICK_CONSTRAINTS: QuickConstraint[] = [
  ...(
    [
      ['peanut', 'Peanuts'],
      ['tree nuts', 'Tree nuts'],
      ['sesame', 'Sesame'],
      ['egg', 'Eggs'],
      ['dairy', 'Dairy'],
      ['gluten', 'Gluten'],
      ['fish', 'Fish'],
      ['soy', 'Soy'],
    ] as const
  ).map(([tag, label]) => ({
    key: `allergen:${tag}`,
    label,
    tagType: 'allergen' as const,
    tag,
    kind: 'medical' as const,
    severity: 'strict' as const,
  })),
  ...(
    [
      ['vegetarian', 'Vegetarian'],
      ['vegan', 'Vegan'],
    ] as const
  ).map(([tag, label]) => ({
    key: `diet:${tag}`,
    label,
    tagType: 'diet' as const,
    tag,
    kind: 'preference' as const,
    severity: 'flexible' as const,
  })),
  ...(
    [
      ['chalav_yisrael', 'Chalav Yisrael'],
      ['pat_yisrael', 'Pat Yisrael'],
      ['glatt', 'Glatt only'],
    ] as const
  ).map(([tag, label]) => ({
    key: `sourcing:${tag}`,
    label,
    tagType: 'kashrut-sourcing' as const,
    tag,
    kind: 'religious' as const,
    severity: 'strict' as const,
  })),
]
