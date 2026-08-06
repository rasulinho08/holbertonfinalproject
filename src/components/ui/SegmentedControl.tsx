import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { select } from '@/lib/haptics';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/** Two-to-four-way switch: leaderboard period, order tabs, chart ranges. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          padding: 3,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.subtle,
          gap: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              select();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              alignItems: 'center',
              backgroundColor: active ? theme.colors.card : 'transparent',
              ...(active ? theme.elevation(1) : {}),
            }}
          >
            <Text variant="smallStrong" color={active ? 'fg' : 'fgMuted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
