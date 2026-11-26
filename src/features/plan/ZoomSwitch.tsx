import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  clamp,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

export type Zoom = 'week' | 'month'

const DURATION = 440
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1)
/** How far each side scales: the month is the zoomed-out view, the week the zoomed-in one. */
const OUT = 0.94
const IN = 1.08

/**
 * Week ↔ month as a camera zoom. Into the week, the month grows toward the week's row and fades while the week grows
 * into place; back out, the week shrinks away while the month settles down from slightly large. The old view is held
 * at its own width, over the new one, until the move ends.
 *
 * As in the Pager, `progress` runs from `seq - 1` to `seq` and each layer works out its look from its own `seq`, so the
 * new view is already at its starting scale on its first frame.
 */
export function ZoomSwitch({
  mode,
  origin,
  children,
}: {
  mode: Zoom
  /** Where each view zooms about, in px from its top. */
  origin: Record<Zoom, number>
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const progress = useSharedValue(0)
  const [cur, setCur] = useState({ mode, seq: 0 })
  const [leaving, setLeaving] = useState<{
    mode: Zoom
    node: React.ReactNode
    width: number
  } | null>(null)
  const last = useRef(children)
  const width = useRef(0)

  if (cur.mode !== mode) {
    setLeaving(reduce ? null : { mode: cur.mode, node: last.current, width: width.current })
    setCur({ mode, seq: cur.seq + 1 })
  }

  useEffect(() => {
    last.current = children
  })

  useLayoutEffect(() => {
    if (cur.seq === 0) return
    if (reduce) {
      progress.value = cur.seq
      return
    }
    progress.value = withTiming(cur.seq, { duration: DURATION, easing: EASE })
    const t = setTimeout(() => setLeaving(null), DURATION + 40)
    return () => clearTimeout(t)
  }, [cur.seq, reduce, progress])

  return (
    <Animated.View
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width
      }}
    >
      <Layer
        key={`in${cur.seq}`}
        seq={cur.seq}
        mode={cur.mode}
        origin={origin[cur.mode]}
        progress={progress}
      >
        {children}
      </Layer>
      {leaving ? (
        <Layer
          key={`out${cur.seq}`}
          seq={cur.seq}
          mode={leaving.mode}
          origin={origin[leaving.mode]}
          progress={progress}
          out
          style={[styles.leaving, { width: leaving.width || undefined }]}
        >
          {leaving.node}
        </Layer>
      ) : null}
    </Animated.View>
  )
}

function Layer({
  seq,
  mode,
  origin,
  out,
  progress,
  style,
  children,
}: {
  seq: number
  mode: Zoom
  origin: number
  out?: boolean
  progress: SharedValue<number>
  style?: object
  children: React.ReactNode
}) {
  const anim = useAnimatedStyle(() => {
    // 0 when the transition starts, 1 when it ends.
    const t = 1 - clamp(seq - progress.value, 0, 1)
    if (out) {
      // Leaving: the month zooms in past the camera, the week falls away.
      const to = mode === 'month' ? IN : OUT
      return {
        opacity: clamp(1 - t * 1.8, 0, 1),
        transform: [{ scale: 1 + (to - 1) * t }],
      }
    }
    // Arriving: the week grows into place, the month settles down from large.
    const from = mode === 'week' ? OUT : IN
    return {
      opacity: clamp(t * 1.5 - 0.15, 0, 1),
      transform: [{ scale: from + (1 - from) * t }],
    }
  })
  return (
    <Animated.View
      style={[style, { transformOrigin: ['50%', origin, 0] }, anim]}
      pointerEvents={out ? 'none' : 'auto'}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  leaving: { position: 'absolute', top: 0, left: 0 },
})
