import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { EyeOff, Flag, Heart, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { usePrefs } from '@/store/prefs';
import { formatCount, formatRelative } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { RatingStars } from '@/components/ui/Rating';
import { Text } from '@/components/ui/Text';
import type { Review } from '@/types';

export interface ReviewCardProps {
  review: Review;
  onLike?: (liked: boolean) => void;
  onComment?: () => void;
  onReport?: () => void;
  style?: ViewStyle;
}

/**
 * Review with the spec's spoiler tag. A spoiler-marked body stays hidden behind
 * a tap target until the reader opts in — and respects the global
 * "hide spoilers" preference in Settings.
 */
export function ReviewCard({ review, onLike, onComment, onReport, style }: ReviewCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const hideSpoilers = usePrefs((s) => s.hideSpoilers);

  const [revealed, setRevealed] = useState(false);
  const concealed = review.isSpoiler && hideSpoilers && !revealed;

  return (
    <View
      style={[
        {
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={review.user.name}
          onPress={() => router.push(`/user/${review.user.username}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}
        >
          <Avatar name={review.user.name} uri={review.user.avatarUrl} size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {review.user.name}
            </Text>
            <Text variant="caption" color="fgSubtle">
              {formatRelative(review.createdAt, locale)}
            </Text>
          </View>
        </Pressable>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="h3" color="primary">
            {review.rating}
            <Text variant="small" color="fgSubtle">
              {t('review.outOf10')}
            </Text>
          </Text>
          <RatingStars value={review.rating} size={11} showValue={false} />
        </View>
      </View>

      {review.isSpoiler ? <Badge label={t('review.spoiler')} tone="warning" /> : null}

      {concealed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('review.showSpoiler')}
          onPress={() => setRevealed(true)}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            paddingVertical: theme.spacing.xl,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.subtle,
          }}
        >
          <EyeOff size={18} color={theme.colors.fgSubtle} />
          <Text variant="small" color="fgMuted">
            {t('review.spoilerHidden')}
          </Text>
          <Text variant="smallStrong" color="primary">
            {t('review.showSpoiler')}
          </Text>
        </Pressable>
      ) : (
        <Text variant="body" color="fgMuted">
          {review.body}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quote.likes', { count: review.likesCount })}
          hitSlop={8}
          onPress={() => onLike?.(!review.isLiked)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Heart
            size={17}
            color={review.isLiked ? theme.colors.danger : theme.colors.fgSubtle}
            fill={review.isLiked ? theme.colors.danger : 'transparent'}
          />
          <Text variant="small" color={review.isLiked ? 'danger' : 'fgSubtle'}>
            {formatCount(review.likesCount)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quote.comments', { count: review.commentsCount })}
          hitSlop={8}
          onPress={onComment}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <MessageCircle size={17} color={theme.colors.fgSubtle} />
          <Text variant="small" color="fgSubtle">
            {formatCount(review.commentsCount)}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        {onReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.report')}
            hitSlop={8}
            onPress={onReport}
          >
            <Flag size={16} color={theme.colors.fgSubtle} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
