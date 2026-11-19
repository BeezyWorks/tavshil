import { Platform } from 'react-native'

import type { WidgetSnapshot } from './model'

/** Imported lazily so Android, web and tests never load the native module. */
const widget = () => (require('./TavshilWidget') as typeof import('./TavshilWidget')).default

/** Hand the home-screen widget its latest data. Never throws: a widget is a convenience. */
export function pushWidgetSnapshot(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'ios') return
  try {
    widget().updateSnapshot(snapshot)
  } catch {
    // Widgets unsupported (simulator without the extension, Expo Go): nothing to do.
  }
}
