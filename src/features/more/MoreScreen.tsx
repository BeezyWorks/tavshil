import React from 'react'

import { Card, ListRow, Screen, useLayout } from '@/components'
import { peopleIsATab } from '@/features/nav/sections'
import { NAV, NAV_MENU } from '@/lib/strings'

/** What is not a tab: People on phones, then Kitchen, Settings, About. */
export function MoreScreen() {
  const { wide } = useLayout()
  const rows = [
    ...(peopleIsATab(wide) ? [] : [NAV_MENU.people]),
    NAV_MENU.kitchen,
    NAV_MENU.settings,
    NAV_MENU.about,
  ]
  return (
    <Screen title={NAV.more.label}>
      <Card>
        {rows.map((r, i) => (
          <ListRow
            key={r.href}
            title={r.label}
            subtitle={r.subtitle}
            href={r.href}
            last={i === rows.length - 1}
          />
        ))}
      </Card>
    </Screen>
  )
}
