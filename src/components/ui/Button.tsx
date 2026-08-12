import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { tap } from '@/lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Rendered before the label — pass a lucide/Ionicons element. */
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Fires a light haptic on press (native only). Defaults to on. */
  haptic?: boolean;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 54 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = true,
  disabled,
  style,
  haptic = true,
  onPress,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const surface: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: theme.colors.primary },
    secondary: { backgroundColor: theme.colors.primarySoft },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: theme.colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: theme.colors.danger },
  };

  const labelColor = {
    primary: 'primaryFg',
    secondary: 'primary',
    outline: 'fg',
    ghost: 'primary',
    danger: 'primaryFg',
  } as const;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          height: HEIGHTS[size],
          paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
          borderRadius: theme.radius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        surface[variant],
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? theme.colors.primaryFg : theme.colors.primary}
        />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text
            variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'}
            color={labelColor[variant]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconRight ? <View>{iconRight}</View> : null}
        </>
      )}
    </Pressable>
  );
}
