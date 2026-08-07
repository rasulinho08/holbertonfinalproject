import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BadgeCheck, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatCount } from '@/lib/format';
import { FadeIn, PressableScale } from '@/components/ui/Motion';
import { Text } from '@/components/ui/Text';
import type { BookList } from '@/types';

export interface BookListCardProps {
  list: BookList;
  index?: number;
}

/**
 * Entry tile for a curated list.
 *
 * The thumbnail is a fanned stack of the first four covers rather than a single
 * one — a list is a collection, and one cover would read as a book.
 */
export function BookListCard({ list, index = 0 }: BookListCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <FadeIn index={index}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={list.title}
        onPress={() => router.push({ pathname: '/list/[id]', params: { id: list.id } })}
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <CoverStack urls={list.coverUrls} />

        <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
              {list.title}
            </Text>
            {list.isOfficial ? (
              <BadgeCheck size={15} color={theme.colors.primary} strokeWidth={2.5} />
            ) : null}
          </View>

          <Text variant="small" color="fgMuted" numberOfLines={2}>
            {list.description}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Text variant="caption" color="fgSubtle">
              {t('list.bookCount', { count: list.bookCount })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Users size={11} color={theme.colors.fgSubtle} />
              <Text variant="caption" color="fgSubtle">
                {formatCount(list.followersCount)}
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </FadeIn>
  );
}

/** Four covers, overlapped and stepped down, reading as a stack of books. */
function CoverStack({ urls }: { urls: string[] }) {
  const theme = useTheme();
  const shown = urls.slice(0, 4);

  return (
    <View style={{ width: 76, height: 84, justifyContent: 'center' }}>
      {shown.length === 0 ? (
        <View
          style={{
            width: 52,
            height: 78,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.subtle,
          }}
        />
      ) : (
        shown.map((url, i) => (
          <Image
            key={i}
            source={{ uri: url }}
            style={{
              position: 'absolute',
              left: i * 8,
              top: i * 2,
              width: 48,
              height: 72 - i * 4,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.imagePlaceholder,
              borderWidth: 1,
              borderColor: theme.colors.card,
              // Later covers sit behind, so the leftmost one reads as the front.
              zIndex: shown.length - i,
            }}
            contentFit="cover"
            transition={theme.duration(theme.motion.fast)}
            cachePolicy="memory-disk"
          />
        ))
      )}
    </View>
  );
}
