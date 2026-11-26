import { Platform } from 'react-native'

import type { IconName } from '@/components/Icon'
import { NAV } from '@/lib/strings'

export type Section = keyof typeof NAV

export const SECTION_ICON: Record<Section, IconName> = {
  plan: 'calendar',
  shopping: 'cart',
  recipes: 'book',
  people: 'people',
  more: 'more',
}

/** Wide web: the pill. People has its own tab; the rest lives behind the gear. */
export const WIDE_TABS: Section[] = ['plan', 'shopping', 'recipes', 'people']
/** Phones (and narrow web): People moves into More. */
export const NARROW_TABS: Section[] = ['plan', 'shopping', 'recipes', 'more']

/** Whether People is a tab of its own here, or a row in More. */
export function peopleIsATab(wide: boolean): boolean {
  return Platform.OS === 'ios' ? Platform.isPad : wide
}

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/** Which section a path belongs to, for highlighting the nav. */
export function sectionOf(path: string, wide: boolean): Section {
  if (under(path, '/shopping') || under(path, '/use-soon')) return 'shopping'
  if (under(path, '/recipes')) return 'recipes'
  if (under(path, '/people')) return wide ? 'people' : 'more'
  if (under(path, '/more') || under(path, '/kitchen') || under(path, '/settings')) return 'more'
  return 'plan'
}
