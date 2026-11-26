import { useRouter, useSegments, type Href } from 'expo-router'
import { useMemo } from 'react'
import { Platform } from 'react-native'

/**
 * Routes that live in more than one tab (the `(a,b,c)` folders under `src/app/(app)`), with the
 * tabs that have them. A bare `/recipes/x` resolves to the first group in the folder name, so on
 * iOS, where each tab has its own stack, it would open in the Recipes tab and "back" would land on
 * the Recipes list instead of where the user came from.
 */
const SHARED: [RegExp, string[]][] = [
  [/^\/recipes\/(?!import(?:[/?]|$))[^/?]+/, ['recipes', 'plan', 'shopping']],
  [/^\/(?:hosted|meal)\//, ['plan', 'shopping']],
  [/^\/people(?:[/?]|$)/, ['more', 'people', 'plan', 'shopping', 'recipes']],
]

/** `href` pinned to the current tab's stack when that tab has the route; otherwise unchanged. */
export function inTab(href: string, segments: readonly string[]): string {
  if (Platform.OS !== 'ios' || segments[0] !== '(app)') return href
  const tab = /^\((\w+)\)$/.exec(segments[1] ?? '')?.[1]
  if (!tab) return href
  const hit = SHARED.find(([re]) => re.test(href))
  if (!hit || !hit[1].includes(tab)) return href
  return `/(app)/(${tab})${href}`
}

/** `useRouter`, but `push`/`navigate`/`replace` of a shared route stay in the current tab. */
export function useTabRouter() {
  const router = useRouter()
  const segments = useSegments() as string[]
  return useMemo(() => {
    const pin = (href: Href) => (typeof href === 'string' ? (inTab(href, segments) as Href) : href)
    return {
      ...router,
      push: (href: Href) => router.push(pin(href)),
      navigate: (href: Href) => router.navigate(pin(href)),
      replace: (href: Href) => router.replace(pin(href)),
    }
  }, [router, segments])
}
