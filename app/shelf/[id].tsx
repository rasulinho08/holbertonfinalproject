import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Library, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useDeleteShelf, useShelfBooks, useShelves } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { BookListItem } from '@/components/book/BookListItem';
import { ProgressSheet } from '@/components/book/ProgressSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book } from '@/types';

export default function ShelfScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: shelves } = useShelves();
  const { data: entries, isLoading, refetch } = useShelfBooks(id);
  const deleteShelf = useDeleteShelf();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [progressBook, setProgressBook] = useState<Book | null>(null);
  const [confirming, setConfirming] = useState(false);

  const shelf = shelves?.find((s) => s.id === id);
  const title = shelf
    ? shelf.status
      ? t(`shelf.${shelf.status === 'want_to_read' ? 'wantToRead' : shelf.status}`)
      : shelf.name
    : '';

  const remove = async () => {
    if (!id) return;
    try {
      await deleteShelf.mutateAsync(id);
      toast.success(t('shelf.deleteShelf'));
      router.back();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={title}
        subtitle={t('shelf.booksCount', { count: entries?.length ?? shelf?.booksCount ?? 0 })}
        right={
          shelf && !shelf.isDefault ? (
            <IconButton label={t('shelf.deleteShelf')} onPress={() => setConfirming(true)}>
              <Trash2 size={18} color={theme.colors.danger} />
            </IconButton>
          ) : undefined
        }
      />

      <FlatList
        data={entries}
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
        renderItem={({ item }) => (
          <BookListItem
            book={item.book}
            showProgress
            right={
              item.status === 'reading' ? (
                <View style={{ justifyContent: 'center' }}>
                  <Button
                    title={t('book.updateProgress')}
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => setProgressBook(item.book)}
                  />
                </View>
              ) : undefined
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={100} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Library size={22} color={theme.colors.fgSubtle} />}
              title={t('shelf.empty')}
              hint={t('shelf.emptyHint')}
              actionLabel={t('nav.explore')}
              onAction={() => router.push('/explore')}
            />
          )
        }
      />

      <ProgressSheet
        book={progressBook}
        visible={!!progressBook}
        onClose={() => setProgressBook(null)}
      />

      <Sheet visible={confirming} onClose={() => setConfirming(false)} title={t('shelf.deleteShelf')}>
        <Text variant="body" color="fgMuted">
          {t('shelf.deleteShelfConfirm', { name: title })}
        </Text>
        <Button
          title={t('common.delete')}
          variant="danger"
          loading={deleteShelf.isPending}
          onPress={remove}
        />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setConfirming(false)} />
      </Sheet>
    </>
  );
}
