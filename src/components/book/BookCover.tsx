import React, { useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

export interface BookCoverProps {
  title: string;
  authorName?: string;
  uri?: string | null;
  /** Cover width; height follows the standard 2:3 book ratio. */
  width?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Book cover with a generated fallback.
 *
 * The catalogue ships without cover images (real covers are licensed assets the
 * backend will serve later), so instead of grey boxes we render a deterministic
 * typographic cover: the same book always gets the same colours, which keeps
 * grids looking designed rather than broken. As soon as the backend returns a
 * `coverUrl`, the real image is used instead.
 */
export function BookCover({ title, authorName, uri, width = 108, radius, style }: BookCoverProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const height = Math.round(width / theme.layout.bookCoverRatio);
  const r = radius ?? theme.radius.sm;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={[
          { width, height, borderRadius: r, backgroundColor: theme.colors.subtle },
          style as object,
        ]}
        contentFit="cover"
        transition={180}
        accessibilityLabel={title}
      />
    );
  }

  const [from, to] = coverColors(title, theme.colors.chart);
  const compact = width < 90;

  return (
    <View
      accessible
      accessibilityLabel={title}
      style={[
        {
          width,
          height,
          borderRadius: r,
          overflow: 'hidden',
          justifyContent: 'space-between',
          padding: compact ? 8 : 10,
          ...theme.elevation(1),
        },
        style,
      ]}
    >
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`cover-${slug(title)}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#cover-${slug(title)})`} />
        {/* Spine highlight — reads as a book rather than a coloured rectangle. */}
        <Rect width={Math.max(3, width * 0.045)} height={height} fill="rgba(0,0,0,0.18)" />
      </Svg>

      <Text
        serif
        numberOfLines={compact ? 3 : 4}
        style={{
          color: '#FFFFFF',
          fontSize: compact ? 10 : width < 130 ? 12 : 14,
          lineHeight: compact ? 13 : width < 130 ? 16 : 19,
          fontWeight: '700',
          marginLeft: width * 0.05,
        }}
      >
        {title}
      </Text>

      {authorName ? (
        <Text
          numberOfLines={1}
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontSize: compact ? 8 : 10,
            marginLeft: width * 0.05,
          }}
        >
          {authorName}
        </Text>
      ) : null}
    </View>
  );
}

/** Stable hash → two chart colours, so a title always yields the same cover. */
function coverColors(seedText: string, chart: readonly string[]): [string, string] {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  const first = chart[hash % chart.length];
  const second = chart[(hash >> 3) % chart.length];
  return [first, first === second ? chart[(hash >> 5) % chart.length] : second];
}

function slug(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 33 + value.charCodeAt(i)) >>> 0;
  return String(hash);
}
