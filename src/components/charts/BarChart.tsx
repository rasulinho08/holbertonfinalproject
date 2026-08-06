import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

export interface BarDatum {
  label: string;
  value: number;
  /** Marks a bar as the current period. */
  highlight?: boolean;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  /** Formats the value shown above the tallest bars. */
  formatValue?: (value: number) => string;
  color?: string;
}

/**
 * Weekly pages / monthly sales bars. Plain views rather than SVG — bars are
 * rectangles, and this keeps them animatable and cheap in a scrolling list.
 */
export function BarChart({ data, height = 120, formatValue, color }: BarChartProps) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height,
          gap: theme.spacing.xs,
        }}
      >
        {data.map((d, i) => {
          const ratio = d.value / max;
          const barColor = d.highlight
            ? theme.colors.primary
            : (color ?? theme.colors.primarySoft);
          return (
            <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              {d.value > 0 && ratio > 0.55 ? (
                <Text variant="caption" color="fgSubtle">
                  {formatValue ? formatValue(d.value) : d.value}
                </Text>
              ) : null}
              <View
                accessibilityLabel={`${d.label}: ${d.value}`}
                style={{
                  width: '100%',
                  maxWidth: 34,
                  height: Math.max(4, ratio * (height - 22)),
                  borderRadius: theme.radius.sm,
                  backgroundColor: barColor,
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.xs }}>
        {data.map((d, i) => (
          <View key={`${d.label}-label-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color={d.highlight ? 'primary' : 'fgSubtle'} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
