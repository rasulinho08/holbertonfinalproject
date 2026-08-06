import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import {
  useFriendsFeed,
  useQuotes,
  useRecommendedBooks,
  useShelfBooks,
  useShelves,
  useStreak,
  useToggleQuoteLike,
  useTrendingBooks,
} from '@/api/hooks';
import { readingPercent } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { BookRail } from '@/components/book/BookRail';
import { ProgressSheet } from '@/components/book/ProgressSheet';
import { ActivityRow } from '@/components/profile/ActivityRow';
import { GoalCard, StreakCard } from '@/components/profile/StatCards';
import { QuoteCard } from '@/components/quote/QuoteCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { Book } from '@/types';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const user = useCurrentUser();

  const { data: shelves } = useShelves();
  const readingShelfId = shelves?.find((s) => s.status === 'reading')?.id;
  const { data: readingEntries, isLoading: readingLoading, refetch: refetchReading } =
    useShelfBooks(readingShelfId);

  const { data: trending, isLoading: trendingLoading } = useTrendingBooks();
  const { data: recommended, isLoading: recommendedLoading } = useRecommendedBooks();
  const { data: streak } = useStreak();
  const { data: feed } = useFriendsFeed();
  const quotesQuery = useQuotes({ sort: 'newest' });
  const toggleLike = useToggleQuoteLike();

  const [progressBook, setProgressBook] = useState<Book | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const readingBooks = useMemo(
    () => (readingEntries ?? []).map((entry) => entry.book),
    [readingEntries],
  );
  const latestQuotes = quotesQuery.data?.pages.flatMap((p) => p.data).slice(0, 6) ?? [];

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingDay');
    return t('home.greetingEvening');
  }, [t]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchReading(), quotesQuery.refetch()]);
    setRefreshing(false);
  };

  return (
    <>
      <AppHeader title={greeting} subtitle={user?.name ?? undefined} actions />

      <Screen onRefresh={refresh} refreshing={refreshing} contentStyle={{ gap: theme.spacing['2xl'] }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <StreakCard
            days={streak?.current ?? user?.stats.streakDays ?? 0}
            readToday={streak?.readToday ?? false}
            onPress={() => router.push('/badges')}
          />
          {user ? <GoalCard goal={user.goal} onPress={() => router.push('/profile')} /> : null}
        </View>

        {/* Continue reading — the highest-intent action on the screen. */}
        <Section
          title={t('home.currentlyReading')}
          action={
            readingBooks.length > 2 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/shelves')}>
                <Text variant="smallStrong" color="primary">
                  {t('common.seeAll')}
                </Text>
              </Pressable>
            ) : null
          }
        >
          {readingLoading ? (
            <View style={{ height: 96, borderRadius: theme.radius.lg, backgroundColor: theme.colors.subtle }} />
          ) : readingBooks.length === 0 ? (
            <EmptyState
              compact
              icon={<BookOpen size={22} color={theme.colors.fgSubtle} />}
              title={t('home.emptyReading')}
              hint={t('home.emptyReadingHint')}
              actionLabel={t('nav.explore')}
              onAction={() => router.push('/explore')}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {readingBooks.slice(0, 3).map((book) => (
                <ContinueReadingRow
                  key={book.id}
                  book={book}
                  onUpdate={() => setProgressBook(book)}
                />
              ))}
            </View>
          )}
        </Section>

        <BookRail
          title={t('home.trending')}
          books={trending}
          loading={trendingLoading}
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/explore')}>
              <Text variant="smallStrong" color="primary">
                {t('common.seeAll')}
              </Text>
            </Pressable>
          }
        />

        <BookRail
          title={t('home.forYou')}
          subtitle={t('home.forYouHint')}
          books={recommended}
          loading={recommendedLoading}
        />

        <Section
          title={t('home.latestQuotes')}
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/quotes')}>
              <Text variant="smallStrong" color="primary">
                {t('common.seeAll')}
              </Text>
            </Pressable>
          }
        >
          <FlatList
            horizontal
            data={latestQuotes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
            renderItem={({ item }) => (
              <QuoteCard
                quote={item}
                style={{ width: 260 }}
                onLike={(liked) => toggleLike.mutate({ id: item.id, liked })}
              />
            )}
            ListEmptyComponent={
              <Text variant="small" color="fgSubtle">
                {t('quote.empty')}
              </Text>
            }
          />
        </Section>

        {feed && feed.length > 0 ? (
          <Section
            title={t('home.friendsActivity')}
            action={
              <Pressable accessibilityRole="button" onPress={() => router.push('/leaderboard')}>
                <ChevronRight size={18} color={theme.colors.fgSubtle} />
              </Pressable>
            }
          >
            <View style={{ gap: theme.spacing.sm }}>
              {feed.slice(0, 6).map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </View>
          </Section>
        ) : null}

        <Button
          title={t('quote.newQuote')}
          variant="secondary"
          icon={<Sparkles size={16} color={theme.colors.primary} />}
          onPress={() => router.push('/quote/new')}
        />
      </Screen>

      <ProgressSheet
        book={progressBook}
        visible={!!progressBook}
        onClose={() => setProgressBook(null)}
      />
    </>
  );
}

function ContinueReadingRow({ book, onUpdate }: { book: Book; onUpdate: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const percent = readingPercent(book.progressPage ?? 0, book.pageCount);

  return (
    <View
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
      <Pressable accessibilityRole="button" onPress={() => router.push(`/book/${book.id}`)}>
        <BookCover title={book.title} authorName={book.authorName} uri={book.coverUrl} width={52} />
      </Pressable>

      <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {book.title}
        </Text>
        <Progress value={percent} height={6} />
        <Text variant="caption" color="fgSubtle">
          {book.progressPage}/{book.pageCount} · {percent}%
        </Text>
      </View>

      <View style={{ justifyContent: 'center' }}>
        <Button
          title={t('home.continueReading')}
          size="sm"
          variant="secondary"
          fullWidth={false}
          onPress={onUpdate}
        />
      </View>
    </View>
  );
}
