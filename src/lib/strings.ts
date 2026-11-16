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
