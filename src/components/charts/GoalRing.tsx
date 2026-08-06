import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

export interface GoalRingProps {
  /** Books finished so far. */
  value: number;
  /** The yearly target. */
  target: number;
  size?: number;
  thickness?: number;
  caption?: string;
}

/** Annual reading-goal ring — the spec's "progress bar showing completion". */
export function GoalRing({ value, target, size = 120, thickness = 10, caption }: GoalRingProps) {
  const theme = useTheme();

  const percent = target > 0 ? Math.min(1, value / target) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = percent >= 1;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        // Start the arc at 12 o'clock instead of 3 o'clock.
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.subtle}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={complete ? theme.colors.success : theme.colors.primary}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - percent)}
          fill="none"
        />
      </Svg>

      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text variant="h1">{value}</Text>
        <Text variant="caption" color="fgSubtle">
          / {target}
        </Text>
        {caption ? (
          <Text variant="caption" color={complete ? 'success' : 'fgMuted'} center>
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
