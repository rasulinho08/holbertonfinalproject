import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { BookCard, BookCardSkeleton } from './BookCard';
import type { Book } from '@/types';

export interface BookRailProps {
  title: string;
  subtitle?: string;
  books: Book[] | undefined;
  loading?: boolean;
  /** When set, a failed request renders a retry row instead of hiding the rail. */
  error?: boolean;
  onRetry?: () => void;
  action?: React.ReactNode;
  cardWidth?: number;
  showProgress?: boolean;
  showPrice?: boolean;
  emptyLabel?: string;
  /** Optional label rendered on each card, e.g. "412 readers". */
  statFor?: (book: Book) => string | null | undefined;
}

/**
 * Horizontally scrolling shelf of books — the primary layout on Home and on the
 * book detail screen. Renders skeletons of the same size while loading so the
 * page does not reflow when data arrives.
 */
export function BookRail({
  title,
  subtitle,
  books,
  loading,
  error,
  onRetry,
  action,
  cardWidth = 118,
  showProgress = false,
  showPrice = true,
  emptyLabel,
  statFor,
}: BookRailProps) {
  const theme = useTheme();
  const { t } = useI18n();

  // A failed request keeps `books` undefined, which would otherwise take the
  // empty path below and silently hide the whole rail. Fail loudly instead.
  if (error && !loading) {
    return (
      <Section
        title={title}
        action={
          onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <Text variant="smallStrong" color="primary">
                {t('common.retry')}
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        <Text variant="small" color="fgSubtle">
          {t('errors.generic')}
        </Text>
      </Section>
    );
  }

  if (!loading && (!books || books.length === 0)) {
    if (!emptyLabel) return null;
    return (
      <Section title={title} action={action}>
        <Text variant="small" color="fgSubtle">
          {emptyLabel}
        </Text>
      </Section>
    );
  }

  return (
    <Section title={title} action={action}>
      {subtitle ? (
        <Text variant="small" color="fgSubtle" style={{ marginTop: -theme.spacing.sm }}>
          {subtitle}
        </Text>
      ) : null}

      {loading ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <BookCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={books}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
          renderItem={({ item, index }) => (
            <BookCard
              book={item}
              index={index}
              width={cardWidth}
              showProgress={showProgress}
              showPrice={showPrice}
              stat={statFor ? statFor(item) : undefined}
            />
          )}
        />
      )}
    </Section>
  );
}
