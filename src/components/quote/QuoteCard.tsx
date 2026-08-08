import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Heart, MessageCircle, MoreHorizontal, Quote as QuoteIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatCount, formatRelative } from '@/lib/format';
import { quoteBackground } from '@/theme/quoteBackgrounds';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import type { Quote } from '@/types';

export interface QuoteCardProps {
  quote: Quote;
  onLike?: (liked: boolean) => void;
  onComment?: () => void;
  onMore?: () => void;
  /** Compact cards drop the footer — used inside book detail carousels. */
  compact?: boolean;
  style?: ViewStyle;
}

/** Re-exported so callers that already import from this module keep working. */
export { quoteBackground as getQuoteBackground };

/**
 * The Instagram-story style quote card the spec puts at the centre of social
 * engagement: gradient background, serif typography, like/comment footer.
 */
export function QuoteCard({ quote, onLike, onComment, onMore, compact, style }: QuoteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const bg = quoteBackground(quote.background);
  const gradientId = `quote-${quote.id}`;
  const long = quote.text.length > 180;

  return (
    <View
      style={[
        {
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={quote.text}
        onPress={() => router.push(`/quote/${quote.id}`)}
      >
        <View style={{ padding: theme.spacing.xl, minHeight: compact ? 130 : 170, justifyContent: 'center' }}>
          <Svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={bg.colors[0]} />
                <Stop offset="1" stopColor={bg.colors[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>

          <QuoteIcon
            size={compact ? 18 : 22}
            color={bg.text}
            opacity={0.35}
            style={{ marginBottom: theme.spacing.sm }}
          />

          <Text
            serif
            numberOfLines={compact ? 4 : long ? 7 : undefined}
            style={{
              color: bg.text,
              fontSize: compact ? 14 : long ? 15 : 17,
              lineHeight: compact ? 21 : long ? 23 : 26,
              fontWeight: '500',
            }}
          >
            {quote.text}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: bg.text,
              opacity: 0.75,
              fontSize: 12,
              marginTop: theme.spacing.md,
            }}
          >
            — {quote.book.title}
            {quote.page ? `, ${t('common.page')} ${quote.page}` : ''}
          </Text>
        </View>
      </Pressable>

      {!compact ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={quote.user.name}
            onPress={() => router.push(`/user/${quote.user.username}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}
          >
            <Avatar name={quote.user.name} uri={quote.user.avatarUrl} size={30} />
            <View style={{ flex: 1 }}>
              <Text variant="smallStrong" numberOfLines={1}>
                {quote.user.name}
              </Text>
              <Text variant="caption" color="fgSubtle">
                {formatRelative(quote.createdAt, locale)}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quote.likes', { count: quote.likesCount })}
            hitSlop={8}
            onPress={() => onLike?.(!quote.isLiked)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Heart
              size={18}
              color={quote.isLiked ? theme.colors.danger : theme.colors.fgSubtle}
              fill={quote.isLiked ? theme.colors.danger : 'transparent'}
            />
            <Text variant="small" color={quote.isLiked ? 'danger' : 'fgSubtle'}>
              {formatCount(quote.likesCount)}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('quote.comments', { count: quote.commentsCount })}
            hitSlop={8}
            onPress={onComment ?? (() => router.push(`/quote/${quote.id}`))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <MessageCircle size={18} color={theme.colors.fgSubtle} />
            <Text variant="small" color="fgSubtle">
              {formatCount(quote.commentsCount)}
            </Text>
          </Pressable>

          {onMore ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.showMore')} hitSlop={8} onPress={onMore}>
              <MoreHorizontal size={18} color={theme.colors.fgSubtle} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
