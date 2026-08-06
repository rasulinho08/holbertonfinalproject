import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const theme = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.subtle, fg: theme.colors.fgMuted },
    primary: { bg: theme.colors.primarySoft, fg: theme.colors.primarySoftFg },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
    accent: { bg: theme.colors.accentSoft, fg: theme.colors.accent },
  };

  const { bg, fg } = tones[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 3,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="caption" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
