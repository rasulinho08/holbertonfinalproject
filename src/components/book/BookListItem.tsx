import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatPrice, readingPercent } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { RatingStars } from '@/components/ui/Rating';
import { Text } from '@/components/ui/Text';
import { BookCover } from './BookCover';
import { shelfKey } from './BookCard';
import type { Book } from '@/types';

export interface BookListItemProps {
  book: Book;
  /** Replaces the default price/rating footer, e.g. with a cart stepper. */
  right?: React.ReactNode;
  showProgress?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Horizontal row used in shelves, search results and order lines. */
export function BookListItem({ book, right, showProgress, onPress, style }: BookListItemProps) {
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
      onPress={onPress ?? (() => router.push(`/book/${book.id}`))}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <BookCover title={book.title} authorName={book.authorName} uri={book.coverUrl} width={56} />

      <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {book.title}
        </Text>
        <Text variant="small" color="fgMuted" numberOfLines={1}>
          {book.authorName}
        </Text>

        {percent !== null ? (
          <View style={{ gap: 4, marginTop: 2 }}>
            <Progress value={percent} height={5} />
            <Text variant="caption" color="fgSubtle">
              {book.progressPage}/{book.pageCount} {t('common.pages')} · {percent}%
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginTop: 2,
            }}
          >
            <RatingStars value={book.ratingAverage} size={12} />
            {book.shelfStatus ? (
              <Badge label={t(`shelf.${shelfKey(book.shelfStatus)}`)} tone="neutral" />
            ) : null}
          </View>
        )}
      </View>

      {right ?? (
        <View style={{ justifyContent: 'center' }}>
          <Text variant="bodyStrong" color="primary">
            {formatPrice(book.price, locale)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
