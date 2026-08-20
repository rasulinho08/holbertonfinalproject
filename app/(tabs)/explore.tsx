import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, ScanLine, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import {
  useBookLists,
  useBooks,
  useGenres,
  usePublications,
  useSearchSuggestions,
} from '@/api/hooks';
import { useDebounced } from '@/lib/hooks';
import { BookCard, BookCardSkeleton } from '@/components/book/BookCard';
import { BookListCard } from '@/components/book/BookListCard';
import { FilterSheet, type Filters, EMPTY_FILTERS, activeFilterCount } from '@/components/book/FilterSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/format';
import { Image } from 'expo-image';

const CARD_WIDTH = 150;
const POST_CARD_WIDTH = 280;

export default function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const params = useLocalSearchParams<{ q?: string; genre?: string }>();

  const [query, setQuery] = useState(params.q ?? '');
  const [filters, setFilters] = useState<Filters>(
    params.genre ? { ...EMPTY_FILTERS, genres: [params.genre as never] } : EMPTY_FILTERS,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedQuery = useDebounced(query, 350);
  const { data: genres } = useGenres();
  const { data: suggestions } = useSearchSuggestions(query);
  const listsQuery = useBookLists('all');
  const featuredLists = listsQuery.data?.pages[0]?.data.slice(0, 3) ?? [];

  const booksQuery = useBooks({ ...filters, q: debouncedQuery || undefined });

  const books = useMemo(
    () => booksQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [booksQuery.data],
  );
  const total = booksQuery.data?.pages[0]?.meta.total ?? 0;
  const suggestion = booksQuery.data?.pages[0]?.meta.suggestion;
  const filterCount = activeFilterCount(filters);
  const browsing = !debouncedQuery && filterCount === 0;
  const publicationsQuery = usePublications(browsing);
  const publications = useMemo(
    () => publicationsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [publicationsQuery.data],
  );

  return (
    <>
      <AppHeader title={t('nav.explore')} actions />

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
      >
        <Input
          containerStyle={{ flex: 1 }}
          value={query}
          onChangeText={setQuery}
          placeholder={t('explore.searchPlaceholder')}
          autoCapitalize="none"
          returnKeyType="search"
          icon={<Search size={18} color={theme.colors.fgSubtle} />}
          rightSlot={
            query ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} onPress={() => setQuery('')}>
                <X size={16} color={theme.colors.fgSubtle} />
              </Pressable>
            ) : undefined
          }
        />

        {/* Scanning sits beside search because it is the same intent — find this
            book — reached with the camera instead of the keyboard. Buried in a
            menu, nobody would discover it. */}
        <View style={{ justifyContent: 'center' }}>
          <IconButton
            label={t('scan.title')}
            variant="card"
            size={48}
            onPress={() => router.push('/scan')}
          >
            <ScanLine size={20} color={theme.colors.fg} />
          </IconButton>
        </View>

        <View style={{ justifyContent: 'center' }}>
          <IconButton
            label={t('explore.filters')}
            variant="card"
            size={48}
            onPress={() => setFiltersOpen(true)}
          >
            <View>
              <SlidersHorizontal size={20} color={theme.colors.fg} />
              {filterCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  <Text variant="caption" style={{ color: theme.colors.primaryFg, fontSize: 9 }}>
                    {filterCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </IconButton>
        </View>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing.md, justifyContent: 'flex-start' }}
        contentContainerStyle={{
          gap: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (booksQuery.hasNextPage && !booksQuery.isFetchingNextPage) {
            void booksQuery.fetchNextPage();
          }
          if (
            browsing &&
            publicationsQuery.hasNextPage &&
            !publicationsQuery.isFetchingNextPage
          ) {
            void publicationsQuery.fetchNextPage();
          }
        }}
        // The stagger resets every page, so an infinite scroll does not
        // accumulate an ever-longer delay on later rows.
        renderItem={({ item, index }) => (
          <BookCard book={item} index={index % 20} width={CARD_WIDTH} />
        )}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.lg }}>
            {/* Type-ahead: direct hits jump straight to the book. */}
            {query.length >= 2 && suggestions && suggestions.books.length > 0 && books.length > 0 ? (
              <View style={{ gap: theme.spacing.xs }}>
                {suggestions.books.slice(0, 3).map((s) => (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/book/${s.id}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      paddingVertical: 6,
                    }}
                  >
                    <Search size={14} color={theme.colors.fgSubtle} />
                    <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
                      {s.title}
                    </Text>
                    <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                      {s.authorName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {browsing ? (
              <View style={{ gap: theme.spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  <Text variant="h3">{t('posts.title')}</Text>
                </View>
                {publicationsQuery.isLoading || !publicationsQuery.data ? (
                  <FlatList
                    horizontal
                    data={[0, 1]}
                    keyExtractor={(i) => String(i)}
                    renderItem={() => (
                      <View style={{ width: POST_CARD_WIDTH, marginLeft: theme.spacing.lg }}>
                        <Skeleton height={220} radius={theme.radius.lg} />
                      </View>
                    )}
                    contentContainerStyle={{ paddingRight: theme.spacing.lg }}
                    showsHorizontalScrollIndicator={false}
                  />
                ) : publications.length === 0 ? null : (
                  <FlatList
                    horizontal
                    data={publications}
                    keyExtractor={(post) => post.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: theme.spacing.md,
                      paddingHorizontal: theme.spacing.lg,
                      paddingEnd: theme.spacing.lg,
                    }}
                    renderItem={({ item: post }) => (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push(`/post/${post.id}` as never)}
                        style={({ pressed }) => ({
                          width: POST_CARD_WIDTH,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Card level={0} style={{ height: '100%', gap: theme.spacing.md }}>
                          {post.coverUrl ? (
                            <View
                              style={{
                                width: '100%',
                                aspectRatio: 16 / 10,
                                borderRadius: theme.radius.md,
                                overflow: 'hidden',
                                backgroundColor: theme.colors.subtle,
                              }}
                            >
                              <Image
                                source={{ uri: post.coverUrl }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                              />
                            </View>
                          ) : null}
                          <View style={{ flex: 1, gap: theme.spacing.sm }}>
                            <Text variant="bodyStrong" numberOfLines={2}>
                              {post.title}
                            </Text>
                            <Text variant="small" color="fgMuted" numberOfLines={3}>
                              {post.excerpt}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: 'auto',
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: theme.spacing.sm,
                                }}
                              >
                                <Avatar
                                  name={post.author.name}
                                  uri={post.author.avatarUrl}
                                  size={16}
                                />
                                <Text variant="caption" color="fgSubtle">
                                  {formatDate(post.createdAt, locale)}
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Text variant="smallStrong" color="primary">
                                  {t('posts.readMore')}
                                </Text>
                                <ArrowRight
                                  size={14}
                                  color={theme.colors.primary}
                                />
                              </View>
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    )}
                  />
                )}
              </View>
            ) : null}

            {browsing && genres ? (
              <View style={{ gap: theme.spacing.md }}>
                <Text variant="h3">{t('explore.popularGenres')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {genres.slice(0, 10).map((genre) => (
                    <Chip
                      key={genre.slug}
                      label={t(`genres.${genre.slug}`)}
                      count={genre.bookCount}
                      onPress={() => setFilters((f) => ({ ...f, genres: [genre.slug] }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Curated lists — a way into a 1000-book catalogue that is not
                search or a genre chip. */}
            {browsing && featuredLists.length > 0 ? (
              <View style={{ gap: theme.spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text variant="h3">{t('list.title')}</Text>
                  <Pressable accessibilityRole="button" onPress={() => router.push('/lists')}>
                    <Text variant="smallStrong" color="primary">
                      {t('common.seeAll')}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ gap: theme.spacing.sm }}>
                  {featuredLists.map((list, i) => (
                    <BookListCard key={list.id} list={list} index={i} />
                  ))}
                </View>
              </View>
            ) : null}

            {!browsing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="small" color="fgMuted" style={{ flex: 1 }}>
                  {t('explore.results', { count: total })}
                </Text>
                {filterCount > 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => setFilters(EMPTY_FILTERS)}>
                    <Badge label={t('explore.clearFilters')} tone="primary" />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {suggestion ? (
              <Pressable accessibilityRole="button" onPress={() => setQuery(suggestion)}>
                <Text variant="small" color="primary">
                  {t('explore.didYouMean', { term: suggestion })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          booksQuery.isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              {[0, 1, 2, 3].map((i) => (
                <BookCardSkeleton key={i} width={CARD_WIDTH} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Search size={22} color={theme.colors.fgSubtle} />}
              title={t('explore.noResults')}
              hint={t('explore.noResultsHint')}
              actionLabel={filterCount > 0 ? t('explore.clearFilters') : undefined}
              onAction={filterCount > 0 ? () => setFilters(EMPTY_FILTERS) : undefined}
            />
          )
        }
        ListFooterComponent={
          booksQuery.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
          ) : null
        }
      />

      <FilterSheet
        visible={filtersOpen}
        value={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />
    </>
  );
}
