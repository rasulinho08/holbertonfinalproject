import React from 'react';
import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { select } from '@/lib/haptics';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Announced by screen readers, e.g. the book title being adjusted. */
  label?: string;
}

/** Quantity control used in the cart. */
export function Stepper({ value, onChange, min = 1, max = 99, label }: StepperProps) {
  const theme = useTheme();

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next === value) return;
    select();
    onChange(next);
  };

  const btn = (dir: -1 | 1, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dir === 1 ? 'Increase' : 'Decrease'}${label ? ` ${label}` : ''}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => step(dir)}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.card,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      {dir === 1 ? (
        <Plus size={16} color={theme.colors.fg} />
      ) : (
        <Minus size={16} color={theme.colors.fg} />
      )}
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        padding: 3,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.subtle,
      }}
    >
      {btn(-1, value <= min)}
      <Text variant="bodyStrong" style={{ minWidth: 24, textAlign: 'center' }}>
        {value}
      </Text>
      {btn(1, value >= max)}
    </View>
  );
}
