import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookPlus, Boxes, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useDeletePublisherBook, usePublisherBooks, useUpdatePublisherBook } from '@/api/hooks';
import { formatPrice } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book } from '@/types';

export default function PublisherBooksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const isPublisher = user?.role === 'publisher';
  const { data: books, isLoading } = usePublisherBooks(isPublisher);
  const update = useUpdatePublisherBook();
  const remove = useDeletePublisherBook();

  const [editing, setEditing] = useState<Book | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const openEditor = (book: Book) => {
    setEditing(book);
    setPrice(String(book.price));
    setStock(String(book.stock));
  };

  const save = async () => {
    if (!editing) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
      });
      toast.success(t('publisher.saved'));
      setEditing(null);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={t('publisher.myBooks')}
        right={
          <IconButton
            label={t('publisher.addBook')}
            variant="subtle"
            onPress={() => router.push('/publisher/books/new')}
          >
            <BookPlus size={20} color={theme.colors.primary} />
          </IconButton>
        }
      />

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
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
          <Card
            level={0}
            onPress={() => openEditor(item)}
            style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}
          >
            <BookCover title={item.title} uri={item.coverUrl} width={46} />

            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {item.title}
              </Text>
              <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                {item.authorName}
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                <Text variant="smallStrong" color="primary">
                  {formatPrice(item.price, locale)}
                </Text>
                <Badge
                  label={`${t('publisher.stock')}: ${item.stock}`}
                  tone={item.stock === 0 ? 'danger' : item.stock < 6 ? 'warning' : 'success'}
                />
              </View>
            </View>

            <IconButton
              label={t('common.delete')}
              onPress={async () => {
                await remove.mutateAsync(item.id);
                toast.success(t('common.delete'));
              }}
            >
              <Trash2 size={16} color={theme.colors.danger} />
            </IconButton>
          </Card>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={92} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Boxes size={22} color={theme.colors.fgSubtle} />}
              title={t('publisher.myBooks')}
              actionLabel={t('publisher.addBook')}
              onAction={() => router.push('/publisher/books/new')}
            />
          )
        }
      />

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={t('publisher.editBook')}>
        <Text variant="small" color="fgMuted" numberOfLines={2}>
          {editing?.title}
        </Text>
        <Input
          label={t('publisher.price')}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Input
          label={t('publisher.stock')}
          value={stock}
          onChangeText={setStock}
          keyboardType="number-pad"
          inputMode="numeric"
        />
        <Button title={t('common.save')} loading={update.isPending} onPress={save} />
      </Sheet>
    </>
  );
}
