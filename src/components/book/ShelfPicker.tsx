import React, { useState } from 'react';
import { View } from 'react-native';
import { BookOpen, BookmarkX, CheckCircle2, ListPlus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useRemoveFromShelf, useSetBookShelf, useShelves } from '@/api/hooks';
import { useOffline } from '@/store/offline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book, ShelfStatus } from '@/types';

export interface ShelfPickerProps {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
}

const OPTIONS: { status: ShelfStatus; labelKey: 'reading' | 'read' | 'wantToRead' | 'dnf' }[] = [
  { status: 'reading', labelKey: 'reading' },
  { status: 'read', labelKey: 'read' },
  { status: 'want_to_read', labelKey: 'wantToRead' },
  { status: 'dnf', labelKey: 'dnf' },
];

/**
 * The spec's User Flow 1: pick a shelf, and when the choice is "currently
 * reading" or "did not finish", capture the page the reader is on.
 */
export function ShelfPicker({ book, visible, onClose }: ShelfPickerProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const toast = useToast();
  const online = useOffline((s) => s.online);
  const enqueue = useOffline((s) => s.enqueue);

  const { data: shelves } = useShelves();
  const setShelf = useSetBookShelf();
  const removeShelf = useRemoveFromShelf();

  const [status, setStatus] = useState<ShelfStatus | null>(null);
  const [page, setPage] = useState('');

  // Seed the draft from the book each time the sheet opens. Done during render
  // via React's "adjusting state when a prop changes" pattern rather than in an
  // effect, which would render once with stale values before correcting itself.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible && book) {
      setStatus(book.shelfStatus ?? null);
      setPage(book.progressPage ? String(book.progressPage) : '');
    }
  }

  if (!book) return null;

  const needsPage = status === 'reading' || status === 'dnf';
  const customShelves = shelves?.filter((s) => !s.isDefault) ?? [];

  const commit = async (shelfId?: string) => {
    if (!status) return;
    const progressPage = needsPage ? Math.max(0, Number(page) || 0) : undefined;

    if (!online) {
      // Offline: park the write and close optimistically. `store/offline.ts`
      // replays it when the connection returns.
      enqueue({ kind: 'shelf.set', bookId: book.id, status, progressPage });
      toast.info(t('common.offlineHint'));
      onClose();
      return;
    }

    try {
      await setShelf.mutateAsync({ bookId: book.id, status, shelfId, progressPage });
      toast.success(t('book.addedToShelf', { shelf: t(`shelf.${shelfLabelKey(status)}`) }));
      onClose();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const remove = async () => {
    try {
      await removeShelf.mutateAsync(book.id);
      toast.success(t('book.removeFromShelf'));
      onClose();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('book.addToShelf')}>
      <Text variant="small" color="fgMuted" numberOfLines={2}>
        {book.title} — {book.authorName}
      </Text>

      <ListGroup>
        {OPTIONS.map((option) => (
          <ListRow
            key={option.status}
            title={t(`shelf.${option.labelKey}`)}
            icon={iconFor(option.status, theme.colors.fgMuted)}
            onPress={() => setStatus(option.status)}
            right={
              status === option.status ? (
                <CheckCircle2 size={20} color={theme.colors.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )
            }
          />
        ))}
      </ListGroup>

      {needsPage ? (
        <Input
          label={`${t('book.currentPage')} (${t('common.of')} ${book.pageCount})`}
          value={page}
          onChangeText={setPage}
          keyboardType="number-pad"
          placeholder="0"
          inputMode="numeric"
        />
      ) : null}

      <Button
        title={t('common.save')}
        loading={setShelf.isPending}
        disabled={!status}
        onPress={() => commit()}
      />

      {customShelves.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="caption" color="fgSubtle">
            {t('shelf.customShelves').toUpperCase()}
          </Text>
          <ListGroup>
            {customShelves.map((shelf) => (
              <ListRow
                key={shelf.id}
                title={shelf.name}
                subtitle={t('shelf.booksCount', { count: shelf.booksCount })}
                icon={<ListPlus size={16} color={theme.colors.fgMuted} />}
                onPress={() => {
                  if (!status) setStatus('want_to_read');
                  void commit(shelf.id);
                }}
              />
            ))}
          </ListGroup>
        </View>
      ) : null}

      {book.shelfStatus ? (
        <Button
          title={t('book.removeFromShelf')}
          variant="ghost"
          loading={removeShelf.isPending}
          icon={<Trash2 size={16} color={theme.colors.danger} />}
          onPress={remove}
        />
      ) : null}
    </Sheet>
  );
}

function iconFor(status: ShelfStatus, color: string) {
  switch (status) {
    case 'reading':
      return <BookOpen size={16} color={color} />;
    case 'read':
      return <CheckCircle2 size={16} color={color} />;
    case 'want_to_read':
      return <ListPlus size={16} color={color} />;
    case 'dnf':
      return <BookmarkX size={16} color={color} />;
  }
}

function shelfLabelKey(status: ShelfStatus): 'read' | 'reading' | 'wantToRead' | 'dnf' {
  if (status === 'want_to_read') return 'wantToRead';
  return status as 'read' | 'reading' | 'dnf';
}
