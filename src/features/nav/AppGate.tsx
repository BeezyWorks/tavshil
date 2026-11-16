import React from 'react'

import { AuthGate } from '@/features/account/AuthGate'
import { usePrepReminders } from '@/features/reminders/useReminders'
import { useSyncPrefs } from '@/features/settings/useSyncPrefs'

function Synced({ children }: { children: React.ReactNode }) {
  useSyncPrefs()
  usePrepReminders()
  return <>{children}</>
}

/** Signed in, with prefs synced: what every signed-in screen sits inside, on every platform. */
export function AppGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Synced>{children}</Synced>
    </AuthGate>
  )
}
