import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

/** Shown instead of an empty list — never leave a blank screen. */
export function EmptyState({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingVertical: compact ? theme.spacing['2xl'] : theme.spacing['4xl'],
          paddingHorizontal: theme.spacing.xl,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.subtle,
            marginBottom: theme.spacing.xs,
          }}
        >
          {icon}
        </View>
      ) : null}

      <Text variant="h3" center>
        {title}
      </Text>

      {hint ? (
        <Text variant="small" color="fgMuted" center>
          {hint}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onAction}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </View>
  );
}
