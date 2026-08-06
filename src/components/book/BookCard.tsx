import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatPrice, readingPercent } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { RatingStars } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { BookCover } from './BookCover';
import type { Book, ShelfStatus } from '@/types';

export interface BookCardProps {
  book: Book;
  width?: number;
  /** Shows the price line — off in shelf contexts where price is noise. */
  showPrice?: boolean;
  /** Shows a reading-progress bar for books on the "reading" shelf. */
  showProgress?: boolean;
  style?: ViewStyle;
}

const SHELF_TONE: Record<ShelfStatus, 'success' | 'primary' | 'info' | 'warning'> = {
  read: 'success',
  reading: 'primary',
  want_to_read: 'info',
  dnf: 'warning',
};

/** Vertical card used in every horizontal carousel and the Explore grid. */
export function BookCard({
  book,
  width = 118,
  showPrice = true,
  showProgress = false,
  style,
}: BookCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const percent =
    showProgress && book.shelfStatus === 'reading'
      ? readingPercent(book.progressPage ?? 0, book.pageCount)
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.authorName}`}
      onPress={() => router.push(`/book/${book.id}`)}
      style={({ pressed }) => [{ width, gap: theme.spacing.sm, opacity: pressed ? 0.8 : 1 }, style]}
    >
      <View>
        <BookCover title={book.title} authorName={book.authorName} uri={book.coverUrl} width={width} />

        {book.shelfStatus ? (
          <Badge
            label={t(`shelf.${shelfKey(book.shelfStatus)}`)}
            tone={SHELF_TONE[book.shelfStatus]}
            style={{ position: 'absolute', top: 6, right: 6 }}
          />
        ) : null}

        {book.stock === 0 ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingVertical: 3,
              alignItems: 'center',
              backgroundColor: theme.colors.overlay,
            }}
          >
            <Text variant="caption" style={{ color: '#FFFFFF' }}>
              {t('book.outOfStock')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="smallStrong" numberOfLines={2}>
          {book.title}
        </Text>
        <Text variant="small" color="fgSubtle" numberOfLines={1}>
          {book.authorName}
        </Text>
      </View>

      {percent !== null ? (
        <View style={{ gap: 4 }}>
          <Progress value={percent} height={4} />
          <Text variant="caption" color="fgSubtle">
            {book.progressPage}/{book.pageCount}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RatingStars value={book.ratingAverage} size={11} />
          {showPrice ? (
            <Text variant="smallStrong" color="primary">
              {formatPrice(book.price, locale)}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function BookCardSkeleton({ width = 118 }: { width?: number }) {
  const theme = useTheme();
  return (
    <View style={{ width, gap: theme.spacing.sm }}>
      <Skeleton width={width} height={Math.round(width / theme.layout.bookCoverRatio)} radius={theme.radius.sm} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="60%" height={10} />
    </View>
  );
}

function shelfKey(status: ShelfStatus): 'read' | 'reading' | 'wantToRead' | 'dnf' {
  switch (status) {
    case 'read':
      return 'read';
    case 'reading':
      return 'reading';
    case 'want_to_read':
      return 'wantToRead';
    case 'dnf':
      return 'dnf';
  }
}

export { shelfKey };
