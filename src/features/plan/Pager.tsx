import React, { useLayoutEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

const DURATION = 380
/** Quick start, long soft landing, like a page let go of. */
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1)
const GAP = 24

/**
 * A horizontal pager over numbered pages (weeks or months): the page before, this one and the one after sit side by
 * side, and dragging sideways moves them under the finger. A drag past a quarter of the width, or a flick, turns the
 * page and calls `onPage(±1)`; the parent changes `index`, and the pages slide to it (the ‹ › buttons do the same).
 *
 * Each page is placed from its own index (`(i - position) × width`), and pages are keyed by index, so when `index`
 * changes no page moves or remounts on its own: only `position` animates.
 */
export function Pager({
  index,
  renderPage,
  onPage,
}: {
  index: number
  renderPage: (i: number) => React.ReactNode
  onPage: (delta: number) => void
}) {
  const reduce = useReducedMotion()
  const position = useSharedValue(index)
  const width = useSharedValue(0)

  useLayoutEffect(() => {
    position.value = reduce ? index : withTiming(index, { duration: DURATION, easing: EASE })
  }, [index, reduce, position])

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const w = width.value + GAP
      if (w > GAP) position.value = index - e.translationX / w
    })
    .onEnd((e) => {
      const w = width.value + GAP
      const moved = w > GAP ? e.translationX / w : 0
      const delta =
        moved < -0.25 || e.velocityX < -500 ? 1 : moved > 0.25 || e.velocityX > 500 ? -1 : 0
      position.value = withTiming(index + delta, { duration: DURATION, easing: EASE })
      if (delta) scheduleOnRN(onPage, delta)
    })

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={styles.frame}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width
        }}
      >
        {[index - 1, index, index + 1].map((i) => (
          <Page key={i} i={i} current={i === index} position={position} width={width}>
            {renderPage(i)}
          </Page>
        ))}
      </Animated.View>
    </GestureDetector>
  )
}

function Page({
  i,
  current,
  position,
  width,
  children,
}: {
  i: number
  current: boolean
  position: SharedValue<number>
  width: SharedValue<number>
  children: React.ReactNode
}) {
  const anim = useAnimatedStyle(() => ({
    // Until the width is known the neighbours would sit on top of this page.
    opacity: current || width.value > 0 ? 1 : 0,
    transform: [{ translateX: (i - position.value) * (width.value + GAP) }],
  }))
  // The current page sets the height; its neighbours lie over it, off to the sides.
  return (
    <Animated.View
      style={[!current && styles.side, anim]}
      pointerEvents={current ? 'auto' : 'none'}
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  side: { position: 'absolute', top: 0, left: 0, right: 0 },
})
