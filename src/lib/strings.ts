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

export const NAV = [
  { href: '/', label: 'Plan' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/shopping', label: 'Shopping' },
  { href: '/prep', label: 'Prep' },
  { href: '/people', label: 'People' },
  { href: '/use-soon', label: 'Use soon' },
  { href: '/settings', label: 'Settings' },
] as const

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
