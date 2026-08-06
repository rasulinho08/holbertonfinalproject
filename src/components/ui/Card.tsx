import React from 'react';
import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  /** Shadow depth. 0 keeps the card flat with just a hairline border. */
  level?: 0 | 1 | 2;
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ level = 1, padded = true, onPress, style, children, ...rest }: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: level === 0 ? 1 : 0,
    borderColor: theme.colors.border,
    padding: padded ? theme.spacing.lg : 0,
    overflow: 'hidden',
    ...(level > 0 ? theme.elevation(level as 1 | 2) : {}),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style as ViewStyle]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}
