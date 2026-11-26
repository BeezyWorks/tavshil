import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  background,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  shapes,
  strikethrough,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

import type { WidgetSnapshot } from './model'

/**
 * Runs in the widget runtime: no hooks, and nothing from module scope. Everything it needs is
 * declared inside the function or arrives in props (see `WidgetSnapshot`).
 *
 * Small: what you cook next, tap to cook. Medium: that card with a Cook button, and the next few prep tasks.
 * Large: the card and the next five prep tasks.
 */
const TavshilWidget = (props: WidgetSnapshot, environment: WidgetEnvironment) => {
  'widget'
  const color = environment.widgetRenderingMode === 'fullColor'
  const dark = environment.colorScheme === 'dark'
  const accent = color ? (dark ? '#7FC29E' : '#2E6A4E') : '#FFFFFF'
  const onAccent = dark ? '#0F1A14' : '#FFFFFF'
  const cardFill = color ? (dark ? '#1C2B23' : '#E7F0EA') : 'rgba(255,255,255,0.12)'
  const muted = { type: 'hierarchical', style: 'secondary' } as const
  const family = environment.widgetFamily
  const small = family === 'systemSmall'
  const big = family === 'systemLarge' || family === 'systemExtraLarge'

  const next = props.next
  const tasks = props.prep.tasks
  const left = props.prep.left

  const cookButton = (url: string) => (
    <Link destination={url}>
      <HStack
        spacing={5}
        modifiers={[padding({ horizontal: 14, vertical: 9 }), background(accent, shapes.capsule())]}
      >
        <Image systemName="play.fill" size={11} color={onAccent} />
        <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle(onAccent)]}>
          Cook
        </Text>
      </HStack>
    </Link>
  )

  const cardBody = (
    <HStack
      alignment="center"
      spacing={10}
      modifiers={[
        padding({ horizontal: 12, vertical: 10 }),
        background(cardFill, shapes.roundedRectangle({ cornerRadius: 14 })),
      ]}
    >
      <VStack alignment="leading" spacing={2}>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 12 }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}
        >
          {next ? next.kicker : 'Cooking next'}
        </Text>
        <Text
          modifiers={[
            font({ weight: 'bold', size: small ? 17 : 19, design: 'rounded' }),
            lineLimit(small ? 3 : 2),
          ]}
        >
          {next ? next.title : 'Nothing planned'}
        </Text>
        {next?.sub ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(1)]}>
            {next.sub}
          </Text>
        ) : null}
      </VStack>
      <Spacer />
      {!small && next?.cookUrl ? cookButton(next.cookUrl) : null}
    </HStack>
  )
  // Medium and large: tapping the card opens that meal on the plan; the Cook button inside wins over it.
  const card = !small && next ? <Link destination={next.url}>{cardBody}</Link> : cardBody

  const task = (t: WidgetSnapshot['prep']['tasks'][number], i: number) => (
    <HStack key={`t${i}`} alignment="center" spacing={8}>
      <Image
        systemName={t.done ? 'checkmark.circle.fill' : 'circle'}
        size={16}
        color={t.done ? accent : '#9A948A'}
      />
      <Text
        modifiers={[
          font({ weight: t.done ? 'regular' : 'semibold', size: 13 }),
          monospacedDigit(),
          foregroundStyle(t.done ? muted : accent),
          frame({ width: 66, alignment: 'leading' }),
        ]}
      >
        {t.time}
      </Text>
      <VStack alignment="leading" spacing={0}>
        <Text
          modifiers={[
            font({ weight: 'medium', size: 14 }),
            lineLimit(1),
            ...(t.done
              ? [foregroundStyle(muted), strikethrough({ isActive: true, pattern: 'solid' })]
              : []),
          ]}
        >
          {t.text}
        </Text>
        {big && t.sub ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>
            {t.sub}
          </Text>
        ) : null}
      </VStack>
      <Spacer />
      {t.cookUrl && !t.done ? (
        <Link destination={t.cookUrl}>
          <Image systemName="play.circle.fill" size={20} color={accent} />
        </Link>
      ) : null}
    </HStack>
  )

  const prepList = () => {
    // Rows that fit under the card: each large row is two lines (task and its sub), so five fills a large
    // widget. More rows overflow and SwiftUI centres the stack, clipping the card at the top.
    const rows = big ? 5 : 2
    const shown = tasks.slice(0, rows)
    const more = tasks.length - shown.length
    return (
      <VStack alignment="leading" spacing={big ? 7 : 6}>
        <HStack>
          <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(muted)]}>
            {left ? `PREP TODAY · ${left} LEFT` : 'PREP TODAY'}
          </Text>
          <Spacer />
          {more > 0 ? (
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{`+${more} more`}</Text>
          ) : null}
        </HStack>
        {tasks.length === 0 ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>
            Nothing to prep today
          </Text>
        ) : left === 0 && !big ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>All done for today</Text>
        ) : (
          shown.map(task)
        )}
      </VStack>
    )
  }

  if (small)
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[widgetURL(next?.cookUrl ?? 'tavshil://?show=todo')]}
      >
        {card}
        <Spacer />
        <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(muted)]}>
          {tasks.length === 0 ? 'No prep today' : left ? `${left} prep left today` : 'Prep done'}
        </Text>
      </VStack>
    )

  return (
    <VStack
      alignment="leading"
      spacing={big ? 14 : 10}
      modifiers={[widgetURL('tavshil://?show=todo')]}
    >
      {card}
      {prepList()}
      <Spacer />
    </VStack>
  )
}

export default createWidget<WidgetSnapshot>('TavshilWidget', TavshilWidget)
