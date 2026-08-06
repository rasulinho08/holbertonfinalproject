import React from 'react';
import { FlatList, View } from 'react-native';
import { useTheme } from '@/theme';
import { Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { BookCard, BookCardSkeleton } from './BookCard';
import type { Book } from '@/types';

export interface BookRailProps {
  title: string;
  subtitle?: string;
  books: Book[] | undefined;
  loading?: boolean;
  action?: React.ReactNode;
  cardWidth?: number;
  showProgress?: boolean;
  showPrice?: boolean;
  emptyLabel?: string;
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
  action,
  cardWidth = 118,
  showProgress = false,
  showPrice = true,
  emptyLabel,
}: BookRailProps) {
  const theme = useTheme();

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
          renderItem={({ item }) => (
            <BookCard
              book={item}
              width={cardWidth}
              showProgress={showProgress}
              showPrice={showPrice}
            />
          )}
        />
      )}
    </Section>
  );
}
