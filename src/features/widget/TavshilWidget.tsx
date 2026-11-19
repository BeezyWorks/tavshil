import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import { font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

import type { WidgetSnapshot } from './model'

/** Which card a widget instance shows; chosen when the widget is added or edited. */
export interface TavshilWidgetConfig {
  view: 'next' | 'shopping' | 'prep' | 'week' | 'all'
}

/**
 * Runs in the widget runtime: no hooks, and nothing from module scope. Everything it needs is
 * declared inside the function or arrives in props (see `WidgetSnapshot`).
 */
const TavshilWidget = (
  props: WidgetSnapshot,
  environment: WidgetEnvironment<TavshilWidgetConfig>,
) => {
  'widget'
  const accent = environment.widgetRenderingMode === 'fullColor' ? '#2E6A4E' : undefined
  const family = environment.widgetFamily
  const big = family === 'systemLarge' || family === 'systemExtraLarge'
  const small = family === 'systemSmall'
  const view = environment.configuration?.view ?? 'next'

  const heading = (text: string) => (
    <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(accent ?? '#FFFFFF')]}>
      {text.toUpperCase()}
    </Text>
  )
  const line = (text: string, key: string, dim = false) => (
    <Text
      key={key}
      modifiers={[font({ size: 13 }), lineLimit(1), ...(dim ? [foregroundStyle('#8A8A85')] : [])]}
    >
      {text}
    </Text>
  )
  const empty = (text: string) => (
    <Text modifiers={[font({ size: 13 }), foregroundStyle('#8A8A85')]}>{text}</Text>
  )

  const next = () => (
    <VStack alignment="leading" spacing={3}>
      {heading(props.next?.title ?? 'Cooking next')}
      {props.next ? (
        <>
          {props.next.when ? line(props.next.when, 'when', true) : null}
          {props.next.dishes.slice(0, small ? 3 : big ? 6 : 4).map((d, i) => line(d, `d${i}`))}
          {props.next.more > 0 && !small ? line(`+${props.next.more} more`, 'more', true) : null}
        </>
      ) : (
        empty('Nothing planned yet')
      )}
    </VStack>
  )

  const shopping = () => (
    <VStack alignment="leading" spacing={3}>
      {heading(props.shopping.count ? `To buy · ${props.shopping.count}` : 'To buy')}
      {props.shopping.count === 0
        ? empty('Nothing left to buy')
        : props.shopping.items.slice(0, small ? 4 : big ? 8 : 5).map((n, i) => line(n, `s${i}`))}
    </VStack>
  )

  const prep = () => (
    <VStack alignment="leading" spacing={3}>
      {heading(props.prep.left ? `Prep today · ${props.prep.left} left` : 'Prep today')}
      {props.prep.tasks.length === 0
        ? empty('No prep today')
        : props.prep.left === 0
          ? empty('All done')
          : props.prep.tasks
              .filter((t) => !t.done)
              .slice(0, small ? 3 : big ? 7 : 4)
              .map((t, i) => line(`${t.time.replace(/\s*(AM|PM)$/i, '')}  ${t.text}`, `p${i}`))}
    </VStack>
  )

  const week = () => (
    <VStack alignment="leading" spacing={3}>
      {heading('This week')}
      {props.week.length === 0
        ? empty('No plan loaded')
        : props.week
            .slice(0, small ? 4 : 7)
            .map((d, i) =>
              line(
                `${d.today ? '› ' : ''}${d.label}  ${
                  [d.note, d.meals.join(', ')].filter(Boolean).join(' · ') || '–'
                }`,
                `w${i}`,
                !d.today,
              ),
            )}
    </VStack>
  )

  const card = (v: TavshilWidgetConfig['view']) =>
    v === 'shopping' ? shopping() : v === 'prep' ? prep() : v === 'week' ? week() : next()

  const body =
    view === 'all' && (big || family === 'systemMedium') ? (
      big ? (
        <VStack alignment="leading" spacing={10}>
          {next()}
          {prep()}
          {shopping()}
          {week()}
        </VStack>
      ) : (
        <HStack alignment="top" spacing={12}>
          {next()}
          {prep()}
        </HStack>
      )
    ) : (
      card(view === 'all' ? 'next' : view)
    )

  return (
    <VStack alignment="leading" modifiers={[padding({ all: 12 })]}>
      {body}
      <Spacer />
    </VStack>
  )
}

export default createWidget<WidgetSnapshot, TavshilWidgetConfig>('TavshilWidget', TavshilWidget)
