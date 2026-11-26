import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'

/**
 * Grows open and shrinks shut, so a panel visibly unfolds and whatever is below it slides along.
 * The content is measured off-flow, so it keeps its natural height while closed.
 */
export function Collapsible({
  open,
  duration = 380,
  children,
}: {
  open: boolean
  duration?: number
  children: React.ReactNode
}) {
  const t = useRef(new Animated.Value(open ? 1 : 0)).current
  const [height, setHeight] = useState(0)
  useEffect(() => {
    Animated.timing(t, {
      toValue: open ? 1 : 0,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [open, t, duration])
  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={{
        overflow: 'hidden',
        height: t.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
        opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] }),
      }}
    >
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  )
}
