import React from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { tap } from '@/lib/haptics';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Trailing text, e.g. the current value of a setting. */
  value?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
}

/** Settings-style row. Grouped by `ListGroup` to get the card + dividers. */
export function ListRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
  toggle,
  destructive,
  right,
  style,
}: ListRowProps) {
  const theme = useTheme();

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 54,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.subtle,
          }}
        >
          {icon}
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'fg'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="fgMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="small" color="fgMuted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={(v) => {
            tap();
            toggle.onChange(v);
          }}
          trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
          thumbColor={theme.colors.card}
          ios_backgroundColor={theme.colors.borderStrong}
        />
      ) : right ? (
        right
      ) : onPress ? (
        <ChevronRight size={18} color={theme.colors.fgSubtle} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? theme.colors.subtle : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}

/** Card wrapper that draws hairlines between its `ListRow` children. */
export function ListGroup({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ gap: theme.spacing.sm }, style]}>
      {title ? (
        <Text variant="caption" color="fgSubtle" style={{ paddingHorizontal: theme.spacing.xs }}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? (
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.border,
                  marginLeft: theme.spacing.lg,
                }}
              />
            ) : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}
