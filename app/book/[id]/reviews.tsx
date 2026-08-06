import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBook, useBookReviews, useReportContent, useToggleReviewLike } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { ReviewCard } from '@/components/review/ReviewCard';
import { ReportSheet } from '@/components/review/ReportSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RatingStars } from '@/components/ui/Rating';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Review } from '@/types';

type SortMode = 'newest' | 'rating' | 'liked';

export default function BookReviewsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: book } = useBook(id);
  const { data: reviews, isLoading, refetch } = useBookReviews(id);
  const toggleLike = useToggleReviewLike();
  const report = useReportContent();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [sort, setSort] = useState<SortMode>('newest');
  const [reporting, setReporting] = useState<Review | null>(null);

  const sorted = useMemo(() => {
    const list = [...(reviews ?? [])];
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'liked') list.sort((a, b) => b.likesCount - a.likesCount);
    else list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return list;
  }, [reviews, sort]);

  return (
    <>
      <AppHeader back title={t('book.allReviews')} subtitle={book?.title} />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
            {book ? (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text variant="display" color="primary">
                  {book.ratingAverage.toFixed(1)}
                </Text>
                <RatingStars value={book.ratingAverage} size={16} showValue={false} />
                <Text variant="small" color="fgSubtle">
                  {t('book.ratingsCount', { count: book.ratingCount })}
                </Text>
              </View>
            ) : null}

            <Button
              title={t('book.writeReview')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/review/new', params: { bookId: id } })}
            />

            <SegmentedControl
              value={sort}
              onChange={setSort}
              options={[
                { value: 'newest', label: t('explore.sortNewest') },
                { value: 'rating', label: t('explore.sortRating') },
                { value: 'liked', label: t('explore.sortPopular') },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onLike={(liked) => toggleLike.mutate({ id: item.id, liked })}
            onReport={() => setReporting(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={140} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<MessageSquare size={22} color={theme.colors.fgSubtle} />}
              title={t('review.empty')}
              hint={t('review.emptyHint')}
              actionLabel={t('book.writeReview')}
              onAction={() => router.push({ pathname: '/review/new', params: { bookId: id } })}
            />
          )
        }
      />

      <ReportSheet
        visible={!!reporting}
        onClose={() => setReporting(null)}
        onSubmit={async (reason, note) => {
          if (!reporting) return;
          await report.mutateAsync({
            targetType: 'review',
            targetId: reporting.id,
            reason,
            note,
            snapshotText: reporting.body,
            snapshotAuthor: reporting.user.name,
            snapshotBook: book?.title ?? null,
          });
          toast.success(t('common.report'));
          setReporting(null);
        }}
      />
    </>
  );
}
