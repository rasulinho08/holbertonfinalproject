import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View, type PressableProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Motion primitives.
 *
 * Everything here is built on the React Native `Animated` API rather than
 * Reanimated. Reanimated is installed (the navigator needs it), but its
 * worklet-based entering/exiting animations behave inconsistently on the Expo
 * web build, and the web build is how this project is demoed. `Animated` with
 * `useNativeDriver` is well-supported on all three platforms and is more than
 * enough for opacity and transform.
 *
 * Every component reads `theme.duration()`, which returns 0 when the reader has
 * asked for reduced motion — so "reduce motion" genuinely stops movement rather
 * than merely shortening it.
 */

export interface FadeInProps {
  children: React.ReactNode;
  /** Milliseconds to wait before starting — use with `index` for a stagger. */
  delay?: number;
  /** Position in a list; multiplied by `theme.motion.stagger` for the delay. */
  index?: number;
  /** How far the element travels on the way in. Negative moves it up. */
  offsetY?: number;
  duration?: number;
  style?: ViewStyle;
}

/**
 * Fades and lifts its children into place once, on mount.
 *
 * Used for list items and page sections so content arrives rather than
 * appearing. Staggering is capped: with `index` on a 40-item grid the last card
 * would otherwise wait almost two seconds.
 */
export function FadeIn({
  children,
  delay,
  index = 0,
  offsetY = 10,
  duration,
  style,
}: FadeInProps) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  const ms = theme.duration(duration ?? theme.motion.base);
  const wait = theme.duration(delay ?? Math.min(index * theme.motion.stagger, 400));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: ms,
      delay: wait,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, ms, wait]);

  // With motion reduced both values are already at their resting state, so the
  // wrapper is inert rather than animating to the same place over 0ms.
  if (ms === 0) return <View style={style}>{children}</View>;

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offsetY, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  /** Scale at full press. */
  scale?: number;
  style?: ViewStyle;
}

/**
 * Press feedback that springs rather than snapping.
 *
 * `Pressable`'s own `pressed` flag switches styles instantly, which reads as a
 * flicker on a card-sized target. This drives the same effect through a spring
 * so the card settles.
 */
export function PressableScale({
  children,
  scale = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const theme = useTheme();
  const [value] = useState(() => new Animated.Value(1));
  const enabled = theme.duration(theme.motion.fast) > 0;

  const spring = (to: number) => {
    if (!enabled) return;
    Animated.spring(value, {
      toValue: to,
      damping: theme.motion.spring.damping,
      stiffness: theme.motion.spring.stiffness,
      mass: theme.motion.spring.mass,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={(e) => {
        spring(scale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale: value }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Animates a number from its previous value to the current one.
 *
 * Counters that jump from 0 to 3,642 the instant a query resolves look like a
 * glitch; counting up reads as the value being measured. Returns the rounded
 * intermediate value for rendering.
 */
export function useCountUp(target: number, duration?: number): number {
  const theme = useTheme();
  const ms = theme.duration(duration ?? theme.motion.slow);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // With motion reduced the render path below returns `target` directly, so
    // there is nothing to animate and no state to push.
    if (ms === 0) return;

    const value = new Animated.Value(0);
    const id = value.addListener(({ value: v }) => setDisplay(Math.round(v)));
    const animation = Animated.timing(value, {
      toValue: target,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      // Listening to the value requires it on the JS thread.
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      value.removeListener(id);
    };
  }, [target, ms]);

  return ms === 0 ? target : display;
}
