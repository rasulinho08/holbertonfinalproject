import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookmarkPlus,
  ChevronRight,
  Package,
  ShoppingCart,
  Timer,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import {
  useAddToCart,
  useBook,
  useBookQuotes,
  useBookReviews,
  useListsForBook,
  useSimilarBooks,
  useToggleReviewLike,
} from '@/api/hooks';
import { formatIsbn, formatPrice, readingPercent } from '@/lib/format';
import { serverMessage } from '@/api/errors';
import { BookCover } from '@/components/book/BookCover';
import { BookListCard } from '@/components/book/BookListCard';
import { BookRail } from '@/components/book/BookRail';
import { ProgressSheet } from '@/components/book/ProgressSheet';
import { ShelfPicker } from '@/components/book/ShelfPicker';
import { QuoteCard } from '@/components/quote/QuoteCard';
import { ReviewCard } from '@/components/review/ReviewCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { RatingStars } from '@/components/ui/Rating';
import { QueryState } from '@/components/ui/QueryState';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function BookDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: book, isLoading, error, refetch } = useBook(id);
  const { data: reviews } = useBookReviews(id);
  const { data: quotes } = useBookQuotes(id);
  const { data: similar, isLoading: similarLoading } = useSimilarBooks(id);
  const { data: bookLists } = useListsForBook(id);
  const addToCart = useAddToCart();
  const toggleReviewLike = useToggleReviewLike();

  const [shelfOpen, setShelfOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || error || !book) {
    return (
      <>
        <AppHeader back actions />
        <Screen>
          <QueryState
            isLoading={isLoading}
            error={error}
            skeleton={[240, 120, 180]}
            onRetry={() => void refetch()}
          />
        </Screen>
      </>
    );
  }

  const percent = readingPercent(book.progressPage ?? 0, book.pageCount);
  const onShelf = !!book.shelfStatus;

  const addToBasket = async () => {
    try {
      await addToCart.mutateAsync({ bookId: book.id });
      toast.success(t('book.addToCart'));
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.outOfStock'));
    }
  };

  return (
    <>
      <AppHeader back actions />

      <Screen bottomInset={84}>
        {/* hero */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <BookCover title={book.title} authorName={book.authorName} uri={book.coverUrl} width={128} />

          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <Text variant="h1">{book.title}</Text>

            <Pressable
              accessibilityRole="link"
              accessibilityLabel={book.authorName}
              onPress={() => router.push(`/author/${book.authorId}`)}
            >
              <Text variant="body" color="primary">
                {book.authorName}
              </Text>
            </Pressable>

            <RatingStars value={book.ratingAverage} size={15} count={book.ratingCount} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {book.genres.map((genre) => (
                <Badge key={genre} label={t(`genres.${genre}`)} tone="neutral" />
              ))}
              <Badge label={t(`languages.${book.language}`)} tone="accent" />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
              <Text variant="h2" color="primary">
                {formatPrice(book.price, locale)}
              </Text>
              {book.oldPrice ? (
                <Text
                  variant="small"
                  color="fgSubtle"
                  style={{ textDecorationLine: 'line-through' }}
                >
                  {formatPrice(book.oldPrice, locale)}
                </Text>
              ) : null}
            </View>

            {book.stock === 0 ? (
              <Badge label={t('book.outOfStock')} tone="danger" />
            ) : book.stock <= 5 ? (
              <Badge label={t('book.lowStock', { count: book.stock })} tone="warning" />
            ) : (
              <Badge label={t('book.inStock')} tone="success" />
            )}
          </View>
        </View>

        {/* reading progress, only once the book is on a shelf */}
        {onShelf ? (
          <Card level={0} style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{t('book.progressTitle')}</Text>
              <Text variant="smallStrong" color="primary">
                {percent}%
              </Text>
            </View>
            <Progress value={percent} height={8} />
            <Text variant="small" color="fgSubtle">
              {book.progressPage}/{book.pageCount} {t('common.pages')}
            </Text>
            <Button
              title={t('book.updateProgress')}
              variant="secondary"
              size="sm"
              onPress={() => setProgressOpen(true)}
            />
          </Card>
        ) : null}

        {/* synopsis */}
        <Section title={t('book.synopsis')}>
          <Text variant="body" color="fgMuted" numberOfLines={expanded ? undefined : 5}>
            {book.description}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)}>
            <Text variant="smallStrong" color="primary">
              {expanded ? t('common.showLess') : t('common.showMore')}
            </Text>
          </Pressable>
        </Section>

        {/* details */}
        <Section title={t('book.details')}>
          <Card level={0} padded={false}>
            <DetailRow label={t('book.publisher')} value={book.publisherName} />
            <DetailRow label={t('book.pageCount')} value={String(book.pageCount)} />
            <DetailRow label={t('book.published')} value={String(book.publishedYear)} />
            <DetailRow label={t('book.language')} value={t(`languages.${book.language}`)} />
            <DetailRow label={t('book.isbn')} value={formatIsbn(book.isbn)} last />
          </Card>
        </Section>

        {/* reading + buddy read entry points */}
        <View style={{ gap: theme.spacing.md }}>
          <Button
            title={t('session.startSession')}
            variant="secondary"
            icon={<Timer size={16} color={theme.colors.primary} />}
            onPress={() => router.push({ pathname: '/read/[id]', params: { id: book.id } })}
          />
          <Button
            title={t('book.startBuddyRead')}
            variant="outline"
            icon={<Users size={16} color={theme.colors.fg} />}
            onPress={() => router.push({ pathname: '/buddy-reads', params: { bookId: book.id } })}
          />
        </View>

        {/* lists this book appears on */}
        {bookLists && bookLists.length > 0 ? (
          <Section title={t('list.inLists')}>
            <View style={{ gap: theme.spacing.sm }}>
              {bookLists.slice(0, 3).map((list, i) => (
                <BookListCard key={list.id} list={list} index={i} />
              ))}
            </View>
          </Section>
        ) : null}

        {/* quotes */}
        {quotes && quotes.length > 0 ? (
          <Section
            title={t('book.quotes')}
            action={
              <Pressable accessibilityRole="button" onPress={() => router.push('/quote/new')}>
                <Text variant="smallStrong" color="primary">
                  {t('quote.newQuote')}
                </Text>
              </Pressable>
            }
          >
            <FlatList
              horizontal
              data={quotes.slice(0, 8)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
              renderItem={({ item }) => (
                <QuoteCard quote={item} compact style={{ width: 230 }} />
              )}
            />
          </Section>
        ) : null}

        {/* reviews */}
        <Section
          title={t('book.reviews')}
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/book/${book.id}/reviews`)}
            >
              <ChevronRight size={18} color={theme.colors.fgSubtle} />
            </Pressable>
          }
        >
          <Button
            title={t('book.writeReview')}
            variant="secondary"
            onPress={() => router.push({ pathname: '/review/new', params: { bookId: book.id } })}
          />

          {!reviews || reviews.length === 0 ? (
            <Text variant="small" color="fgSubtle">
              {t('review.empty')}
            </Text>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {reviews.slice(0, 3).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onLike={(liked) => toggleReviewLike.mutate({ id: review.id, liked })}
                  onComment={() => router.push(`/review/${review.id}`)}
                />
              ))}
            </View>
          )}
        </Section>

        <BookRail
          title={t('book.alsoLiked')}
          books={similar}
          loading={similarLoading}
        />
      </Screen>

      {/* sticky action bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <Button
          title={onShelf ? t('book.changeShelf') : t('book.addToShelf')}
          variant="outline"
          style={{ flex: 1 }}
          icon={<BookmarkPlus size={16} color={theme.colors.fg} />}
          onPress={() => setShelfOpen(true)}
        />
        <Button
          title={book.stock === 0 ? t('book.outOfStock') : t('book.addToCart')}
          style={{ flex: 1 }}
          disabled={book.stock === 0}
          loading={addToCart.isPending}
          icon={
            book.stock === 0 ? (
              <Package size={16} color={theme.colors.primaryFg} />
            ) : (
              <ShoppingCart size={16} color={theme.colors.primaryFg} />
            )
          }
          onPress={addToBasket}
        />
      </View>

      <ShelfPicker book={book} visible={shelfOpen} onClose={() => setShelfOpen(false)} />
      <ProgressSheet book={book} visible={progressOpen} onClose={() => setProgressOpen(false)} />
    </>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="small" color="fgMuted">
        {label}
      </Text>
      <Text variant="smallStrong" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
