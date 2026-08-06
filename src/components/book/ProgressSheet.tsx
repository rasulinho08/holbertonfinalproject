import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useUpdateProgress } from '@/api/hooks';
import { useOffline } from '@/store/offline';
import { readingPercent } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book } from '@/types';

export interface ProgressSheetProps {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
}

/** Quick page-number update — the most frequent action a reader performs. */
export function ProgressSheet({ book, visible, onClose }: ProgressSheetProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const toast = useToast();
  const update = useUpdateProgress();
  const online = useOffline((s) => s.online);
  const enqueue = useOffline((s) => s.enqueue);

  const [page, setPage] = useState('');

  // Seed the field when the sheet opens — see the note in ShelfPicker.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible && book) setPage(String(book.progressPage ?? 0));
  }

  if (!book) return null;

  const parsed = Math.max(0, Math.min(book.pageCount, Number(page) || 0));
  const percent = readingPercent(parsed, book.pageCount);

  const save = async () => {
    if (!online) {
      enqueue({ kind: 'progress.update', bookId: book.id, page: parsed });
      toast.info(t('common.offlineHint'));
      onClose();
      return;
    }
    try {
      await update.mutateAsync({ bookId: book.id, page: parsed });
      toast.success(t('book.progressSaved'));
      onClose();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('book.updateProgress')}>
      <Text variant="small" color="fgMuted" numberOfLines={2}>
        {book.title}
      </Text>

      <Input
        label={t('book.currentPage')}
        value={page}
        onChangeText={setPage}
        keyboardType="number-pad"
        inputMode="numeric"
        hint={`${t('common.of')} ${book.pageCount} ${t('common.pages')}`}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Progress value={percent} height={10} label={t('book.progressTitle')} />
        <Text variant="smallStrong" color="primary">
          {percent}%
        </Text>
      </View>

      {/* Common jumps, so the reader rarely has to type. */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {[10, 25, 50].map((delta) => (
          <Button
            key={delta}
            title={`+${delta}`}
            variant="outline"
            size="sm"
            fullWidth={false}
            style={{ flex: 1 }}
            onPress={() => setPage(String(Math.min(book.pageCount, parsed + delta)))}
          />
        ))}
        <Button
          title="100%"
          variant="outline"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={() => setPage(String(book.pageCount))}
        />
      </View>

      <Button title={t('common.save')} loading={update.isPending} onPress={save} />
    </Sheet>
  );
}
