import React from 'react';
import { View } from 'react-native';
import { CloudOff, Dices } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { BookCover } from './BookCover';
import type { Book } from '@/types';

export interface RandomPickPanelProps {
  book: Book | null;
  loading: boolean;
  error: boolean;
  onPick: () => void;
  onOpen: (book: Book) => void;
}

export function RandomPickPanel({ book, loading, error, onPick, onOpen }: RandomPickPanelProps) {
  if (loading && !book) {
    return <PickSkeleton />;
  }

  if (book) {
    return (
      <PickResult
        book={book}
        loading={loading}
        onPick={onPick}
        onOpen={() => onOpen(book)}
      />
    );
  }

  if (error) {
    return <PickError onRetry={onPick} />;
  }

  return <PickEmpty onPick={onPick} />;
}

function PickEmpty({ onPick }: { onPick: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card
      level={0}
      style={{
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primarySoft,
        }}
      >
        <Dices size={24} color={theme.colors.primary} />
      </View>

      <Text variant="small" color="fgMuted" center>
        {t('home.pickForMeHint')}
      </Text>

      <Button
        title={t('home.pickForMe')}
        icon={<Dices size={16} color={theme.colors.primaryFg} />}
        onPress={onPick}
        style={{ marginTop: theme.spacing.sm }}
      />
    </Card>
  );
}

function PickResult({
  book,
  loading,
  onPick,
  onOpen,
}: {
  book: Book;
  loading: boolean;
  onPick: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card level={0} style={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <BookCover title={book.title} authorName={book.authorName} uri={book.coverUrl} width={84} />

        <View style={{ flex: 1, gap: theme.spacing.xs, minWidth: 0 }}>
          <Text variant="h3" numberOfLines={2}>
            {book.title}
          </Text>
          <Text variant="small" color="fgSubtle" numberOfLines={1}>
            {book.authorName}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {book.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} label={t(`genres.${genre}`)} tone="neutral" />
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          title={t('home.openBook')}
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={onOpen}
        />
        <Button
          title={t('home.pickAnother')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          loading={loading}
          icon={<Dices size={14} color={theme.colors.primary} />}
          style={{ flex: 1 }}
          onPress={onPick}
        />
      </View>
    </Card>
  );
}

function PickError({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card
      level={0}
      style={{
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.subtle,
          marginBottom: theme.spacing.xs,
        }}
      >
        <CloudOff size={22} color={theme.colors.fgSubtle} />
      </View>

      <Text variant="small" color="fgMuted" center>
        {t('errors.generic')}
      </Text>

      <Button
        title={t('common.retry')}
        variant="secondary"
        size="sm"
        fullWidth={false}
        onPress={onRetry}
        style={{ marginTop: theme.spacing.sm }}
      />
    </Card>
  );
}

function PickSkeleton() {
  const theme = useTheme();

  return (
    <Card level={0}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <Skeleton
          width={84}
          height={Math.round(84 / theme.layout.bookCoverRatio)}
          radius={theme.radius.sm}
        />
        <View style={{ flex: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
          <Skeleton width="90%" height={16} />
          <Skeleton width="55%" height={12} />
          <Skeleton width="75%" height={12} />
        </View>
      </View>
    </Card>
  );
}