import React, { useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { usePrefs } from '@/store/prefs';
import { coverSizeFor } from '@/lib/images';
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
 * Open Library serves the same cover at three sizes, named by a suffix:
 * `…-S.jpg`, `…-M.jpg`, `…-L.jpg`. The catalogue stores the medium URL, so a
 * 52px list row and a 160px detail hero would otherwise download the same file.
 * Rewriting the suffix to match the rendered width means a grid of forty covers
 * pulls forty thumbnails rather than forty half-megabyte JPEGs.
 */
function sizedUri(uri: string, width: number, dataSaver: boolean): string {
  return uri.replace(
    /(covers\.openlibrary\.org\/[ab]\/(?:id|olid)\/[^/]+)-[SML]\.jpg$/i,
    (_match, stem: string) => `${stem}-${coverSizeFor(width, dataSaver)}.jpg`,
  );
}

/**
 * Book cover, with a generated fallback.
 *
 * Most of the catalogue has real cover art from Open Library. The rest — mostly
 * Azerbaijani editions Open Library has never catalogued — gets a deterministic
 * typographic cover rather than a grey box: the same book always draws the same
 * two colours, so a shelf of fallbacks still looks designed. `onError` routes a
 * dead CDN into that same fallback at runtime.
 */
export function BookCover({ title, authorName, uri, width = 108, radius, style }: BookCoverProps) {
  const theme = useTheme();
  const dataSaver = usePrefs((s) => s.dataSaver);
  const [failed, setFailed] = useState(false);

  const height = Math.round(width / theme.layout.bookCoverRatio);
  const r = radius ?? theme.radius.sm;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri: sizedUri(uri, width, dataSaver) }}
        onError={() => setFailed(true)}
        style={[
          {
            width,
            height,
            borderRadius: r,
            backgroundColor: theme.colors.imagePlaceholder,
            ...theme.elevation(1),
          },
          style as object,
        ]}
        // Real covers are not all 2:3 — Open Library has square art, tall
        // paperbacks and wide hardbacks. `cover` cropped the title off the
        // edge of the wider ones, so the whole cover is fitted inside the
        // slot instead and the placeholder colour fills any letterboxing.
        contentFit="contain"
        transition={theme.duration(theme.motion.base)}
        cachePolicy="memory-disk"
        accessibilityLabel={title}
      />
    );
  }

  const [from, to] = coverColors(title, theme.colors.chart);
  const compact = width < 90;
  const gradientId = `cover-${slug(title)}`;

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
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${gradientId})`} />
        {/* Spine highlight — reads as a book rather than a coloured rectangle. */}
        <Rect width={Math.max(3, width * 0.045)} height={height} fill="rgba(0,0,0,0.22)" />
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
