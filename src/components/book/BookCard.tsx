import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, BookOpen, Check, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatPrice, readingPercent } from '@/lib/format';
import { FadeIn, PressableScale } from '@/components/ui/Motion';
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
  /** Position in its rail or grid; staggers the entrance animation. */
  index?: number;
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
  index = 0,
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
    <FadeIn index={index} style={style}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${book.title}, ${book.authorName}`}
        onPress={() => router.push(`/book/${book.id}`)}
        style={{ width, gap: theme.spacing.sm }}
      >
        <View
          style={{
            width,
            borderRadius: theme.radius.sm,
            // Clips the out-of-stock strip to the cover's rounded corners, and
            // stops any overlay from painting outside the card's column.
            overflow: 'hidden',
          }}
        >
          <BookCover
            title={book.title}
            authorName={book.authorName}
            uri={book.coverUrl}
            width={width}
          />

          {book.shelfStatus ? <ShelfMarker status={book.shelfStatus} /> : null}

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

        {/* Fixed height for the two text lines, so cards in a rail stay level
            whether or not a title wraps: two 19px title lines + 2px gap + one
            19px author line. */}
        <View style={{ gap: 2, height: 60 }}>
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.xs,
            }}
          >
            <RatingStars value={book.ratingAverage} size={11} compact />
            {showPrice ? (
              <Text variant="smallStrong" color="primary" numberOfLines={1}>
                {formatPrice(book.price, locale)}
              </Text>
            ) : null}
          </View>
        )}
      </PressableScale>
    </FadeIn>
  );
}

const SHELF_ICON: Record<ShelfStatus, typeof Check> = {
  read: Check,
  reading: BookOpen,
  want_to_read: Bookmark,
  dnf: X,
};

/**
 * Corner marker for a book already on one of the reader's shelves.
 *
 * This used to be a full `Badge` with its label — but "Oxumaq istəyirəm" is
 * 17 characters, which overflowed a 118px card and painted over the title. A
 * glyph carries the same four states in a fixed 22px, and the accessible label
 * keeps the wording for screen readers.
 */
function ShelfMarker({ status }: { status: ShelfStatus }) {
  const theme = useTheme();
  const { t } = useI18n();
  const Icon = SHELF_ICON[status];
  const tone = SHELF_TONE[status];

  return (
    <View
      accessible
      accessibilityLabel={t(`shelf.${shelfKey(status)}`)}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors[`${tone}Soft`],
        borderWidth: 1,
        borderColor: theme.colors[tone],
      }}
    >
      <Icon size={12} color={theme.colors[tone]} strokeWidth={2.5} />
    </View>
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
