import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { select } from '@/lib/haptics';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  /** Renders a count on the trailing edge, e.g. genre facets. */
  count?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Filter pill used by Explore facets, genre pickers and the onboarding quiz. */
export function Chip({ label, selected = false, onPress, icon, count, disabled, style }: ChipProps) {
  const theme = useTheme();

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.card,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="smallStrong" color={selected ? 'primary' : 'fgMuted'}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text variant="small" color="fgSubtle">
          {count}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={4}
      onPress={() => {
        select();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {body}
    </Pressable>
  );
}
