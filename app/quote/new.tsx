import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Check, ScanText, Search, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBooks, useCreateQuote, useOcrExtract, useShelfBooks, useShelves } from '@/api/hooks';
import { useDebounced } from '@/lib/hooks';
import {
  DEFAULT_QUOTE_BACKGROUND,
  QUOTE_BACKGROUNDS,
  quoteBackground,
} from '@/theme/quoteBackgrounds';
import { serverMessage } from '@/api/errors';
import { BookCover } from '@/components/book/BookCover';
import { Button } from '@/components/ui/Button';
import { QuotePage } from '@/components/quote/QuoteCard';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book } from '@/types';

const MAX_LENGTH = 1000;

/**
 * Quote composer: pick a book, type or OCR the passage, choose a background.
 *
 * OCR runs server-side (`POST /ocr/extract`); this screen only captures the
 * image and shows the extracted text for the reader to correct.
 */
export default function NewQuoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const params = useLocalSearchParams<{ bookId?: string }>();

  const { data: shelves } = useShelves();
  const readingShelfId = shelves?.find((s) => s.status === 'reading')?.id;
  const { data: readingEntries } = useShelfBooks(readingShelfId);

  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const searchQuery = useBooks({ q: debouncedSearch || undefined });

  const [pickedBook, setPickedBook] = useState<Book | null>(null);
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const [background, setBackground] = useState<string>(DEFAULT_QUOTE_BACKGROUND.id);

  const create = useCreateQuote();
  const ocr = useOcrExtract();

  const suggested = useMemo(
    () => (readingEntries ?? []).map((e) => e.book),
    [readingEntries],
  );

  // When the composer is opened from a book page, that book is pre-selected.
  // Derived rather than copied into state, so there is no effect to keep in sync.
  const book = pickedBook ?? suggested.find((b) => b.id === params.bookId) ?? null;

  const searchResults = searchQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const bg = quoteBackground(background);

  const scan = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      const extracted = await ocr.mutateAsync({ imageUri: result.assets[0].uri });
      if (extracted.available === false || !extracted.text) {
        toast.info(t('quote.ocrUnavailable'));
        return;
      }
      setText((prev) => (prev ? `${prev}\n${extracted.text}` : extracted.text));
      toast.success(t('quote.ocrDone'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const submit = async () => {
    if (!book || text.trim().length < 5) return;
    try {
      await create.mutateAsync({
        bookId: book.id,
        text: text.trim(),
        page: page ? Number(page) : null,
        background,
      });
      toast.success(t('quote.posted'));
      router.back();
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    }
  };

  return (
    <>
      <Screen keyboardAware contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Text variant="h2" style={{ flex: 1 }}>
            {t('quote.newQuote')}
          </Text>
          <IconButton label={t('common.close')} variant="subtle" onPress={() => router.back()}>
            <X size={20} color={theme.colors.fg} />
          </IconButton>
        </View>

        {/* Live preview: the same component the feed renders. */}
        <View
          style={{
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.elevation(2),
          }}
        >
          <QuotePage
            background={bg}
            text={text}
            placeholder={t('quote.quotePlaceholder')}
            bookTitle={book?.title}
            authorName={book?.authorName}
            coverUrl={book?.coverUrl}
            page={page}
            size="full"
            gradientId="composer-preview"
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="smallStrong" color="fgMuted">
            {t('quote.background')}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {QUOTE_BACKGROUNDS.map((option) => {
              const active = option.id === background;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.id}
                  onPress={() => setBackground(option.id)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: theme.radius.pill,
                    padding: 3,
                    borderWidth: 2,
                    borderColor: active ? theme.colors.primary : 'transparent',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: theme.radius.pill,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Svg
                      width="100%"
                      height="100%"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    >
                      <Defs>
                        <LinearGradient id={`sw-${option.id}`} x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor={option.colors[0]} />
                          <Stop offset="1" stopColor={option.colors[1]} />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill={`url(#sw-${option.id})`} />
                    </Svg>
                    {active ? <Check size={14} color={option.text} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* book selection */}
        <Card
          level={0}
          onPress={() => setBookPickerOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
        >
          {book ? (
            <>
              <BookCover title={book.title} uri={book.coverUrl} width={40} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {book.title}
                </Text>
                <Text variant="small" color="fgMuted" numberOfLines={1}>
                  {book.authorName}
                </Text>
              </View>
              <Text variant="smallStrong" color="primary">
                {t('common.edit')}
              </Text>
            </>
          ) : (
            <>
              <View
                style={{
                  width: 40,
                  height: 60,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.subtle,
                }}
              />
              <Text variant="bodyStrong" color="fgMuted" style={{ flex: 1 }}>
                {t('quote.selectBook')}
              </Text>
            </>
          )}
        </Card>

        <Input
          label={t('quote.quoteText')}
          value={text}
          onChangeText={(v) => setText(v.slice(0, MAX_LENGTH))}
          multiline
          placeholder={t('quote.quotePlaceholder')}
          hint={`${text.length}/${MAX_LENGTH}`}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('quote.ocrHint')}
          disabled={ocr.isPending}
          onPress={scan}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginTop: -theme.spacing.md,
            alignSelf: 'flex-start',
            paddingVertical: theme.spacing.xs,
            opacity: pressed || ocr.isPending ? 0.6 : 1,
          })}
        >
          <ScanText size={16} color={theme.colors.primary} />
          <Text variant="smallStrong" color="primary">
            {ocr.isPending ? t('quote.ocrRunning') : t('quote.ocrScan')}
          </Text>
        </Pressable>

        <Input
          label={`${t('quote.pageNumber')} (${t('common.optional')})`}
          value={page}
          onChangeText={setPage}
          keyboardType="number-pad"
          inputMode="numeric"
        />

        <Button
          title={t('quote.post')}
          loading={create.isPending}
          disabled={!book || text.trim().length < 5}
          onPress={submit}
        />
      </Screen>

      <Sheet
        visible={bookPickerOpen}
        onClose={() => setBookPickerOpen(false)}
        title={t('quote.selectBook')}
        scrollable={false}
      >
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t('explore.searchPlaceholder')}
          icon={<Search size={18} color={theme.colors.fgSubtle} />}
        />
        <FlatList
          data={search ? searchResults : suggested}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 360 }}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.sm }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => {
                setPickedBook(item);
                setBookPickerOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.subtle : 'transparent',
              })}
            >
              <BookCover title={item.title} uri={item.coverUrl} width={34} />
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                  {item.authorName}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text variant="small" color="fgSubtle" center>
              {t('explore.noResults')}
            </Text>
          }
        />
      </Sheet>
    </>
  );
}
