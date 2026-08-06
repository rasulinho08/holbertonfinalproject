import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCreatePublisherBook, useGenres } from '@/api/hooks';
import * as validate from '@/lib/validation';
import { serverMessage } from '@/api/errors';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { BookLanguage, GenreSlug } from '@/types';

const LANGUAGES: BookLanguage[] = ['az', 'en', 'tr', 'ru'];

export default function NewPublisherBookScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const { data: genres } = useGenres();
  const create = useCreatePublisherBook();

  const [form, setForm] = useState({
    title: '',
    authorName: '',
    isbn: '',
    description: '',
    coverUrl: '',
    pageCount: '',
    publishedYear: String(new Date().getFullYear()),
    price: '',
    stock: '',
  });
  const [language, setLanguage] = useState<BookLanguage>('az');
  const [selectedGenres, setSelectedGenres] = useState<GenreSlug[]>([]);
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const next = {
      title: validate.required(form.title),
      authorName: validate.required(form.authorName),
      price: validate.required(form.price),
    };
    setErrors(next);
    if (!validate.isValid(next)) return;

    try {
      await create.mutateAsync({
        title: form.title.trim(),
        authorName: form.authorName.trim(),
        isbn: form.isbn.trim(),
        language,
        genres: selectedGenres.length ? selectedGenres : ['novel'],
        description: form.description.trim(),
        coverUrl: form.coverUrl.trim() || null,
        pageCount: Number(form.pageCount) || 200,
        publishedYear: Number(form.publishedYear) || new Date().getFullYear(),
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
      });
      toast.success(t('publisher.saved'));
      router.back();
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader back title={t('publisher.addBook')} />

      <Screen keyboardAware>
        <View style={{ gap: theme.spacing.md }}>
          <Input
            label={t('publisher.bookTitle')}
            value={form.title}
            onChangeText={set('title')}
            error={errors.title ? t(errors.title) : undefined}
          />
          <Input
            label={t('publisher.author')}
            value={form.authorName}
            onChangeText={set('authorName')}
            error={errors.authorName ? t(errors.authorName) : undefined}
          />
          <Input
            label={t('publisher.isbn')}
            value={form.isbn}
            onChangeText={set('isbn')}
            keyboardType="number-pad"
            placeholder="9789952000000"
          />
          <Input
            label={t('publisher.description')}
            value={form.description}
            onChangeText={set('description')}
            multiline
          />
          <Input
            label={`${t('publisher.coverUrl')} (${t('common.optional')})`}
            value={form.coverUrl}
            onChangeText={set('coverUrl')}
            autoCapitalize="none"
            placeholder="https://…"
            hint={t('book.details')}
          />
        </View>

        <Section title={t('publisher.genre')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {(genres ?? []).map((genre) => (
              <Chip
                key={genre.slug}
                label={t(`genres.${genre.slug}`)}
                selected={selectedGenres.includes(genre.slug)}
                onPress={() =>
                  setSelectedGenres((prev) =>
                    prev.includes(genre.slug)
                      ? prev.filter((g) => g !== genre.slug)
                      : [...prev, genre.slug],
                  )
                }
              />
            ))}
          </View>
        </Section>

        <Section title={t('publisher.language')}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {LANGUAGES.map((code) => (
              <Chip
                key={code}
                label={t(`languages.${code}`)}
                selected={language === code}
                onPress={() => setLanguage(code)}
              />
            ))}
          </View>
        </Section>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Input
            containerStyle={{ flex: 1 }}
            label={t('publisher.price')}
            value={form.price}
            onChangeText={set('price')}
            error={errors.price ? t(errors.price) : undefined}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
          <Input
            containerStyle={{ flex: 1 }}
            label={t('publisher.stock')}
            value={form.stock}
            onChangeText={set('stock')}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Input
            containerStyle={{ flex: 1 }}
            label={t('publisher.pageCount')}
            value={form.pageCount}
            onChangeText={set('pageCount')}
            keyboardType="number-pad"
            inputMode="numeric"
          />
          <Input
            containerStyle={{ flex: 1 }}
            label={t('publisher.publishedYear')}
            value={form.publishedYear}
            onChangeText={set('publishedYear')}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        </View>

        <Button title={t('common.save')} loading={create.isPending} onPress={submit} />

        <Text variant="caption" color="fgSubtle" center>
          {t('publisher.title')}
        </Text>
      </Screen>
    </>
  );
}
