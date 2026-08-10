import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Trash2, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import {
  useBookList,
  useDeleteBookList,
  useRemoveBookFromList,
  useToggleListFollow,
} from '@/api/hooks';
import { formatCount } from '@/lib/format';
import { BookListItem } from '@/components/book/BookListItem';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { QueryState } from '@/components/ui/QueryState';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function BookListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useCurrentUser();
  const { data: list, isLoading, error, refetch } = useBookList(id);
  const toggleFollow = useToggleListFollow();
  const removeBook = useRemoveBookFromList();
  const removeList = useDeleteBookList();

  const [confirming, setConfirming] = useState(false);

  const isOwner = !!list && !!user && list.owner.id === user.id;

  const destroy = async () => {
    if (!id) return;
    try {
      await removeList.mutateAsync(id);
      toast.success(t('list.deleted'));
      router.back();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  if (isLoading || error || !list) {
    return (
      <>
        <AppHeader back title={t('list.title')} />
        <View style={{ flex: 1, gap: theme.spacing.md, padding: theme.spacing.lg }}>
          <QueryState
            isLoading={isLoading}
            error={error}
            skeleton={[120, 100, 100, 100]}
            onRetry={() => void refetch()}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <AppHeader
        back
        title={list.title}
        right={
          isOwner ? (
            <IconButton label={t('common.delete')} onPress={() => setConfirming(true)}>
              <Trash2 size={18} color={theme.colors.danger} />
            </IconButton>
          ) : undefined
        }
      />

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.bookId}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Avatar name={list.owner.name} uri={list.owner.avatarUrl} size={32} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text variant="smallStrong" numberOfLines={1}>
                    {list.owner.name}
                  </Text>
                  {list.isOfficial ? (
                    <BadgeCheck size={14} color={theme.colors.primary} strokeWidth={2.5} />
                  ) : null}
                </View>
                <Text variant="caption" color="fgSubtle">
                  {t('list.bookCount', { count: list.bookCount })}
                </Text>
              </View>
            </View>

            <Text variant="body" color="fgMuted">
              {list.description}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Button
                title={list.isFollowing ? t('list.unfollow') : t('list.follow')}
                variant={list.isFollowing ? 'outline' : 'primary'}
                size="sm"
                fullWidth={false}
                loading={toggleFollow.isPending}
                onPress={() =>
                  toggleFollow.mutate({ id: list.id, follow: !list.isFollowing })
                }
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={13} color={theme.colors.fgSubtle} />
                <Text variant="small" color="fgSubtle">
                  {formatCount(list.followersCount)}
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ gap: 4 }}>
            <BookListItem
              book={item.book}
              right={
                isOwner ? (
                  <View style={{ justifyContent: 'center' }}>
                    <IconButton
                      label={t('common.delete')}
                      onPress={() =>
                        removeBook.mutate({ listId: list.id, bookId: item.bookId })
                      }
                    >
                      <Trash2 size={16} color={theme.colors.fgSubtle} />
                    </IconButton>
                  </View>
                ) : undefined
              }
            />
            {item.note ? (
              <Text
                variant="small"
                color="fgMuted"
                style={{ paddingHorizontal: theme.spacing.md }}
              >
                {item.note}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title={t('list.emptyBooks')}
            hint={isOwner ? t('list.emptyBooksHint') : undefined}
            actionLabel={isOwner ? t('nav.explore') : undefined}
            onAction={isOwner ? () => router.push('/explore') : undefined}
          />
        }
      />

      <Sheet visible={confirming} onClose={() => setConfirming(false)} title={t('common.delete')}>
        <Text variant="body" color="fgMuted">
          {t('list.deleteConfirm', { name: list.title })}
        </Text>
        <Button
          title={t('common.delete')}
          variant="danger"
          loading={removeList.isPending}
          onPress={destroy}
        />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setConfirming(false)} />
      </Sheet>
    </>
  );
}
