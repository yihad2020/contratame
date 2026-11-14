import { useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@/constants/theme';

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Visual surface: receives the scale transform. */
  style?: StyleProp<ViewStyle>;
  /** Layout box: use for flex sizing so the hit area matches the surface. */
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

const useNativeDriver = Platform.OS !== 'web';

/**
 * Pressable with spring scale feedback. The transform runs on the native
 * driver, so presses never trigger a React re-render or a layout pass.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  pressedScale = motion.pressedScale,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));

  function springTo(toValue: number, config: { speed: number; bounciness: number }) {
    Animated.spring(scale, { toValue, useNativeDriver, ...config }).start();
  }

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        if (!disabled) springTo(pressedScale, motion.pressSpring);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        springTo(1, motion.releaseSpring);
        onPressOut?.(event);
      }}
      style={containerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
