import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { select } from '@/lib/haptics';
import { Text } from './Text';

/**
 * The spec asks for a 1–10 scale (1000Kitap style). Ten stars is too wide for a
 * phone, so ratings are stored 1–10 and rendered as five stars with halves —
 * `RatingStars` displays, `RatingInput` collects.
 */

export interface RatingStarsProps {
  /** 1–10. */
  value: number;
  size?: number;
  /** Appends the numeric value, e.g. "8.4". */
  showValue?: boolean;
  /**
   * Renders a single star plus the number instead of the full five.
   *
   * Five stars at 11px plus "8.0" needs about 90px; on a 118px book card that
   * left no room for the price beside it, and the two collided. One star says
   * the same thing in a third of the width.
   */
  compact?: boolean;
  count?: number;
  style?: ViewStyle;
}

export function RatingStars({
  value,
  size = 14,
  showValue = true,
  compact = false,
  count,
  style,
}: RatingStarsProps) {
  const theme = useTheme();
  const outOfFive = value / 2;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, style]}>
      {compact ? (
        <Star size={size} color={theme.colors.rating} fill={theme.colors.rating} strokeWidth={2} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 1 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const filled = outOfFive - i;
            return (
              <Star
                key={i}
                size={size}
                color={theme.colors.rating}
                fill={filled >= 0.75 ? theme.colors.rating : 'transparent'}
                strokeWidth={2}
                opacity={filled >= 0.25 ? 1 : 0.35}
              />
            );
          })}
        </View>
      )}
      {showValue || compact ? (
        <Text variant="smallStrong" color="fgMuted">
          {value.toFixed(1)}
        </Text>
      ) : null}
      {typeof count === 'number' ? (
        <Text variant="small" color="fgSubtle">
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

export interface RatingInputProps {
  /** 0 means "not rated yet". */
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Ten tappable segments so the user can pick any whole value from 1 to 10. */
export function RatingInput({ value, onChange, size = 30 }: RatingInputProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: value === n }}
              accessibilityLabel={`${n} / 10`}
              hitSlop={4}
              onPress={() => {
                select();
                onChange(n);
              }}
              style={{
                flex: 1,
                height: size,
                borderRadius: theme.radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.subtle,
              }}
            >
              <Text variant="smallStrong" color={active ? 'primaryFg' : 'fgSubtle'}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value > 0 ? <RatingStars value={value} size={18} /> : null}
    </View>
  );
}
