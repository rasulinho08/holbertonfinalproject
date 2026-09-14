import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { FadeIn, PressableScale } from '@/components/ui/Motion';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import type { Author } from '@/types';

export interface AuthorCardProps {
  author: Author;
  width?: number;
  index?: number;
  style?: ViewStyle;
}

/** Compact author card with avatar, name, book count and follower count. */
export function AuthorCard({ author, width = 132, index = 0, style }: AuthorCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <FadeIn index={index} style={style}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={author.name}
        onPress={() => router.push(`/author/${author.id}`)}
        style={{ width, alignItems: 'center', gap: theme.spacing.sm }}
      >
        <Avatar name={author.name} uri={author.photoUrl} size={64} />

        <Text variant="smallStrong" numberOfLines={2} style={{ textAlign: 'center' }}>
          {author.name}
        </Text>

        <Text variant="caption" color="fgSubtle" numberOfLines={1} style={{ textAlign: 'center' }}>
          {t('home.authorStats', { books: author.bookCount, followers: author.followersCount })}
        </Text>
      </PressableScale>
    </FadeIn>
  );
}

export function AuthorCardSkeleton({ width = 132 }: { width?: number }) {
  return (
    <View style={{ width, alignItems: 'center', gap: 8 }}>
      <Skeleton width={64} height={64} radius={32} />
      <Skeleton width="70%" height={12} />
      <Skeleton width="90%" height={10} />
    </View>
  );
}
