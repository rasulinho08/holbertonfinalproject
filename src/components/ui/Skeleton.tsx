import React, { useEffect, useState } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { usePrefs } from '@/store/prefs';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Loading placeholder. Lists render skeletons of the right shape instead of a
 * spinner so layout does not jump when the data lands.
 */
export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const dataSaver = usePrefs((s) => s.dataSaver);
  // Lazy initial state rather than a ref: the value is read during render, and
  // a ref read at render time is exactly what React warns about.
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    if (dataSaver) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, dataSaver]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.subtle,
          opacity: dataSaver ? 0.6 : pulse,
        },
        style,
      ]}
    />
  );
}

/** Convenience wrapper: a vertical run of skeleton lines. */
export function SkeletonLines({ count = 3, gap = 8 }: { count?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={i === count - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}
