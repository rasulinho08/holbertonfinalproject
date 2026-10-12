import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, PenLine, Quote as QuoteIcon, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useQuotes, useToggleQuoteLike } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { useCurrentUser } from '@/store/auth';
import { QuoteCard } from '@/components/quote/QuoteCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

type Sort = 'newest' | 'popular';

export default function QuotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const user = useCurrentUser();

  const [sort, setSort] = useState<Sort>('newest');
  const quotesQuery = useQuotes({ sort });
  const toggleLike = useToggleQuoteLike();
  const { refreshing, onRefresh } = useRefresh(quotesQuery.refetch);

  const quotes = useMemo(
    () => quotesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [quotesQuery.data],
  );

  const compose = () => router.push('/quote/new');

  const header = (
    <View style={{ gap: theme.spacing.lg }}>
      {/* An invitation to write, in place of a bare "+" in the header. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quote.newQuote')}
        onPress={compose}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.xl,
          backgroundColor: pressed ? theme.colors.subtle : theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        })}
      >
        {user ? <Avatar name={user.name} uri={user.avatarUrl} size={40} /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{t('quote.promptTitle')}</Text>
          <Text variant="small" color="fgMuted" numberOfLines={1}>
            {t('quote.promptHint')}
          </Text>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PenLine size={18} color={theme.colors.primaryFg} />
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Chip
          label={t('explore.sortNewest')}
          selected={sort === 'newest'}
          onPress={() => setSort('newest')}
          icon={<Sparkles size={14} color={sort === 'newest' ? theme.colors.primary : theme.colors.fgMuted} />}
        />
        <Chip
          label={t('explore.sortPopular')}
          selected={sort === 'popular'}
          onPress={() => setSort('popular')}
          icon={<Flame size={14} color={sort === 'popular' ? theme.colors.primary : theme.colors.fgMuted} />}
        />
      </View>
    </View>
  );

  return (
    <>
      <AppHeader title={t('nav.quotes')} subtitle={t('quote.subtitle')} actions />

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.xl,
          padding: theme.spacing.lg,
          // Clears the floating tab bar.
          paddingBottom: 120,
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
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <QuoteCard quote={item} onLike={(liked) => toggleLike.mutate({ id: item.id, liked })} />
        )}
        ListEmptyComponent={
          quotesQuery.isLoading ? (
            <View style={{ gap: theme.spacing.xl }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={260} radius={theme.radius.xl} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<QuoteIcon size={22} color={theme.colors.fgSubtle} />}
              title={t('quote.empty')}
              hint={t('quote.emptyHint')}
              actionLabel={t('quote.newQuote')}
              onAction={compose}
            />
          )
        }
        ListFooterComponent={
          quotesQuery.isFetchingNextPage ? <ActivityIndicator color={theme.colors.primary} /> : null
        }
      />
    </>
  );
}
