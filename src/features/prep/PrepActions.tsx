import React from 'react'

import { Button } from '@/components'
import { canNotify } from '@/features/cook/notifications'
import { REMINDERS } from '@/lib/strings'

/** The top right of the Prep header: a bell to the prep reminder settings, where notifications exist (iOS). */
export function PrepActions() {
  if (!canNotify) return null
  return <Button label={REMINDERS.title} icon="bell" iconOnly variant="ghost" href="/reminders" />
}
