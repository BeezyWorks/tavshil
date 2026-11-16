import { Slot } from 'expo-router'
import React from 'react'

import { AppGate } from './AppGate'
import { Shell } from './WebNav'

/** Web (and Android): a hand-built nav around the current route. iOS uses `NativeAppLayout`. */
export function AppLayout() {
  return (
    <AppGate>
      <Shell>
        <Slot />
      </Shell>
    </AppGate>
  )
}

/** A tab's own navigation. On the web the browser keeps history, so the route just renders. */
export function TabLayout() {
  return <Slot />
}
