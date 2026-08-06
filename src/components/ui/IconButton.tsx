import React from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { tap } from '@/lib/haptics';

export interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Required — icon-only controls are invisible to screen readers without it. */
  label: string;
  size?: number;
  variant?: 'plain' | 'subtle' | 'card';
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  children,
  onPress,
  label,
  size = 40,
  variant = 'plain',
  disabled,
  style,
}: IconButtonProps) {
  const theme = useTheme();

  const bg =
    variant === 'subtle' ? theme.colors.subtle : variant === 'card' ? theme.colors.card : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: variant === 'card' ? 1 : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
