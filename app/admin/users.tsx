import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ShieldCheck, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useAdminUsers } from '@/api/hooks';
import { useDebounced } from '@/lib/hooks';
import { formatCount, formatRelative } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

/**
 * The user directory.
 *
 * Read-only on purpose. Changing someone's role or deleting an account from a
 * phone, with no confirmation flow and no audit of who tapped what, is a
 * mistake waiting to happen — those belong behind a desk. This answers "who is
 * using the app and what have they done", which is what the dashboard link
 * promises.
 */
export default function AdminUsersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const me = useCurrentUser();
  const isAdmin = me?.role === 'admin';

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 350);
  const query = useAdminUsers(debounced, isAdmin);

  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  if (!isAdmin) {
    return (
      <>
        <AppHeader back title={t('admin.users')} />
        <Screen>
          <EmptyState
            icon={<ShieldCheck size={22} color={theme.colors.fgSubtle} />}
            title={t('errors.forbidden')}
            hint={t('errors.forbiddenAdmin')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppHeader
        back
        title={t('admin.users')}
        subtitle={total > 0 ? t('explore.results', { count: total }) : undefined}
      />

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['5xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.md }}>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={t('admin.searchUsers')}
              icon={<Search size={18} color={theme.colors.fgSubtle} />}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View style={{ gap: theme.spacing.sm }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={68} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Users size={22} color={theme.colors.fgSubtle} />}
              title={t('explore.noResults')}
            />
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <Card
            level={0}
            onPress={() => router.push(`/user/${item.username}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
          >
            <Avatar name={item.name} uri={item.avatarUrl} size={40} />

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {item.name}
                </Text>
                {/* Only non-default roles are labelled; a badge on every reader
                    would be noise on every row. */}
                {item.role !== 'user' ? (
                  <Badge
                    label={item.role === 'admin' ? t('nav.admin') : t('nav.publisher')}
                    tone={item.role === 'admin' ? 'danger' : 'info'}
                  />
                ) : null}
                {item.deleted ? <Badge label={t('admin.deleted')} tone="danger" /> : null}
              </View>

              <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                @{item.username} · {item.email}
              </Text>

              <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                {item.booksRead} {t('admin.books').toLowerCase()} · {item.reviewsCount}{' '}
                {t('admin.reviews').toLowerCase()} · {item.quotesCount}{' '}
                {t('admin.quotes').toLowerCase()}
              </Text>
            </View>

            {/* Only shown when there is one. The label repeated down every row,
                mostly above a dash, was noise rather than information. */}
            {item.lastActiveAt ? (
              <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: 88 }}>
                <Text variant="caption" color="fgSubtle">
                  {t('admin.lastActive')}
                </Text>
                <Text variant="caption" color="fgMuted" numberOfLines={1}>
                  {formatRelative(item.lastActiveAt, locale)}
                </Text>
              </View>
            ) : null}
          </Card>
        )}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <Skeleton height={68} radius={theme.radius.lg} style={{ marginTop: theme.spacing.sm }} />
          ) : null
        }
      />
    </>
  );
}
