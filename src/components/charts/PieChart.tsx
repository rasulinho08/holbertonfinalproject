import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieSlice[];
  size?: number;
  /** 0 = full pie, 0.6 = donut with a 60% hole. */
  innerRatio?: number;
  /** Text rendered in the middle of a donut. */
  centerLabel?: string;
  centerSublabel?: string;
  legend?: boolean;
}

/**
 * Genre distribution donut for the profile screen.
 *
 * Hand-rolled on `react-native-svg` rather than pulling a charting library:
 * three charts do not justify the dependency, and this renders identically on
 * iOS, Android and web.
 */
export function PieChart({
  data,
  size = 160,
  innerRatio = 0.62,
  centerLabel,
  centerSublabel,
  legend = true,
}: PieChartProps) {
  const theme = useTheme();

  const slices = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total <= 0) return [];

    const r = size / 2;
    const inner = r * innerRatio;
    let angle = -Math.PI / 2; // start at 12 o'clock

    return data.map((d, i) => {
      const sweep = (d.value / total) * Math.PI * 2;
      const end = angle + sweep;
      // A single slice covering the whole circle cannot be drawn with one arc.
      const path =
        sweep >= Math.PI * 2 - 1e-6
          ? donutFullCircle(r, inner)
          : donutSlice(r, inner, angle, end);
      const item = {
        key: `${d.label}-${i}`,
        path,
        color: d.color ?? theme.colors.chart[i % theme.colors.chart.length],
        label: d.label,
        value: d.value,
        percent: Math.round((d.value / total) * 100),
      };
      angle = end;
      return item;
    });
  }, [data, size, innerRatio, theme.colors.chart]);

  if (slices.length === 0) {
    return (
      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            stroke={theme.colors.subtle}
            strokeWidth={size * (1 - innerRatio) * 0.5}
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl }}>
      <View>
        <Svg width={size} height={size}>
          <G transform={`translate(${size / 2}, ${size / 2})`}>
            {slices.map((s) => (
              <Path key={s.key} d={s.path} fill={s.color} />
            ))}
          </G>
        </Svg>
        {centerLabel ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="h2">{centerLabel}</Text>
            {centerSublabel ? (
              <Text variant="caption" color="fgSubtle">
                {centerSublabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {legend ? (
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          {slices.slice(0, 6).map((s) => (
            <View
              key={s.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
            >
              <View
                style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }}
              />
              <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
                {s.label}
              </Text>
              <Text variant="smallStrong" color="fgMuted">
                {s.percent}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* --------------------------------- paths --------------------------------- */

function polar(radius: number, angle: number) {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function donutSlice(outer: number, inner: number, start: number, end: number): string {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const o1 = polar(outer, start);
  const o2 = polar(outer, end);
  const i2 = polar(inner, end);
  const i1 = polar(inner, start);

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

function donutFullCircle(outer: number, inner: number): string {
  return [
    `M ${-outer} 0`,
    `A ${outer} ${outer} 0 1 1 ${outer} 0`,
    `A ${outer} ${outer} 0 1 1 ${-outer} 0`,
    `M ${-inner} 0`,
    `A ${inner} ${inner} 0 1 0 ${inner} 0`,
    `A ${inner} ${inner} 0 1 0 ${-inner} 0`,
    'Z',
  ].join(' ');
}
