import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Quote as QuoteIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useQuotes, useToggleQuoteLike } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { QuoteCard } from '@/components/quote/QuoteCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';

export default function QuotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const quotesQuery = useQuotes({ sort });
  const toggleLike = useToggleQuoteLike();
  const { refreshing, onRefresh } = useRefresh(quotesQuery.refetch);

  const quotes = useMemo(
    () => quotesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [quotesQuery.data],
  );

  return (
    <>
      <AppHeader
        title={t('nav.quotes')}
        actions
        right={
          <IconButton label={t('quote.newQuote')} variant="subtle" onPress={() => router.push('/quote/new')}>
            <Plus size={20} color={theme.colors.primary} />
          </IconButton>
        }
      />

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (quotesQuery.hasNextPage && !quotesQuery.isFetchingNextPage) {
            void quotesQuery.fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: t('explore.sortNewest') },
              { value: 'popular', label: t('explore.sortPopular') },
            ]}
          />
        }
        renderItem={({ item }) => (
          <QuoteCard quote={item} onLike={(liked) => toggleLike.mutate({ id: item.id, liked })} />
        )}
        ListEmptyComponent={
          quotesQuery.isLoading ? (
            <View style={{ gap: theme.spacing.lg }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={220} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<QuoteIcon size={22} color={theme.colors.fgSubtle} />}
              title={t('quote.empty')}
              hint={t('quote.emptyHint')}
              actionLabel={t('quote.newQuote')}
              onAction={() => router.push('/quote/new')}
            />
          )
        }
        ListFooterComponent={
          quotesQuery.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : null
        }
      />
    </>
  );
}
