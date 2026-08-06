import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface ProgressProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
  label?: string;
}

export function Progress({ value, height = 8, color, trackColor, style, label }: ProgressProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      accessibilityLabel={label}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.colors.subtle,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.primary,
        }}
      />
    </View>
  );
}
