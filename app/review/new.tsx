import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBook, useCreateReview } from '@/api/hooks';
import { serverMessage } from '@/api/errors';
import { BookCover } from '@/components/book/BookCover';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { RatingInput } from '@/components/ui/Rating';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function NewReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const { data: book } = useBook(bookId);
  const create = useCreateReview();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating === 0) {
      setError(t('review.ratingRequired'));
      return;
    }
    setError(null);

    try {
      await create.mutateAsync({ bookId: bookId!, rating, body: body.trim(), isSpoiler });
      toast.success(t('review.posted'));
      router.back();
    } catch (err) {
      toast.error(serverMessage(err) ?? t('errors.generic'));
    }
  };

  return (
    <Screen keyboardAware contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Text variant="h2" style={{ flex: 1 }}>
          {t('book.writeReview')}
        </Text>
        <IconButton label={t('common.close')} variant="subtle" onPress={() => router.back()}>
          <X size={20} color={theme.colors.fg} />
        </IconButton>
      </View>

      {book ? (
        <Card level={0} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
          <BookCover title={book.title} uri={book.coverUrl} width={44} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {book.title}
            </Text>
            <Text variant="small" color="fgMuted" numberOfLines={1}>
              {book.authorName}
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="bodyStrong">{t('review.yourRating')}</Text>
        <RatingInput value={rating} onChange={setRating} />
        {error ? (
          <Text variant="small" color="danger">
            {error}
          </Text>
        ) : null}
      </View>

      <Input
        label={t('review.yourReview')}
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={t('review.reviewPlaceholder')}
        hint={`${body.length}/2000`}
      />

      {/* Spoiler tag — reviews marked here are blurred by ReviewCard. */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSpoiler }}
        onPress={() => setIsSpoiler((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: isSpoiler ? theme.colors.primary : theme.colors.borderStrong,
            backgroundColor: isSpoiler ? theme.colors.primary : 'transparent',
          }}
        >
          {isSpoiler ? <Check size={14} color={theme.colors.primaryFg} /> : null}
        </View>
        <Text variant="body">{t('review.spoiler')}</Text>
      </Pressable>

      <Button title={t('review.post')} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}
