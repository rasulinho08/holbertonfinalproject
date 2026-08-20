import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Check, ImagePlus, Search, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';
import {
  useBooks,
  useCreatePublication,
} from '@/api/hooks';
import type { Book, ID, PublicationDraft } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { BookCover } from '@/components/book/BookCover';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Image } from 'expo-image';
import { useDebounced } from '@/lib/hooks';

type BookPick = { bookId: ID; note: string | null };

export default function NewPublicationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<BookPick[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const debouncedBookSearch = useDebounced(bookSearch, 300);

  const create = useCreatePublication();
  const booksQuery = useBooks({ q: debouncedBookSearch || undefined });
  const searchBooks = useMemo(
    () => booksQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [booksQuery.data],
  );

  const canPublish = title.trim().length > 0 && content.trim().length > 0 && !create.isPending;

  async function pickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('common.tryAgain'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setUploadingCover(true);
    try {
      const uploaded = await api.post<{ id: string; url: string }>(Endpoints.uploads.create, {
        uri,
        kind: 'publication',
      });
      setCoverUrl(uploaded.url);
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setUploadingCover(false);
    }
  }

  function addBook(book: Book) {
    setSelectedBooks((current) => {
      if (current.some((p) => p.bookId === book.id)) return current;
      return [...current, { bookId: book.id, note: null }];
    });
    setBookSearch('');
  }

  function removeBook(bookId: string) {
    setSelectedBooks((current) => current.filter((p) => p.bookId !== bookId));
  }

  function updateNote(bookId: string, note: string) {
    setSelectedBooks((current) =>
      current.map((p) => (p.bookId === bookId ? { ...p, note: note || null } : p)),
    );
  }

  async function handlePublish() {
    const draft: PublicationDraft = {
      title: title.trim(),
      content: content.trim(),
      coverUrl,
      recommendedBooks: selectedBooks.map((p) => ({
        bookId: p.bookId,
        note: p.note?.trim() ?? null,
      })),
    };
    try {
      const created = await create.mutateAsync(draft);
      router.replace(`/post/${created.id}` as never);
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }

  return (
    <RoleGate role="admin">
      <>
        <AppHeader back title={t('posts.createTitle')} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              gap: theme.spacing['2xl'],
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing['4xl'],
              width: '100%',
              maxWidth: theme.layout.maxContentWidth,
              alignSelf: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Card level={0} style={{ gap: theme.spacing.md }}>
              <Text variant="smallStrong">{t('posts.cover')}</Text>
              <View
                style={{
                  width: '100%',
                  aspectRatio: 16 / 10,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.subtle,
                  overflow: 'hidden',
                }}
              >
                {coverUrl ? (
                  <View style={{ flex: 1 }}>
                    <Image
                      source={{ uri: coverUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    <IconButton
                      label={t('common.close')}
                      variant="card"
                      size={36}
                      onPress={() => setCoverUrl(null)}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      <X size={16} color={theme.colors.danger} />
                    </IconButton>
                  </View>
                ) : (
                  <Button
                    variant="outline"
                    onPress={pickCover}
                    loading={uploadingCover}
                    icon={<ImagePlus size={16} color={theme.colors.fg} />}
                    style={{
                      flex: 1,
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing.sm,
                    }}
                    title={t('posts.coverHint')}
                  />
                )}
              </View>
            </Card>

            <Card level={0} style={{ gap: theme.spacing.sm }}>
              <Text variant="smallStrong">{t('posts.titleField')}</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder={t('posts.titlePlaceholder')}
                maxLength={200}
              />
            </Card>

            <Card level={0} style={{ gap: theme.spacing.sm }}>
              <Text variant="smallStrong">{t('posts.content')}</Text>
              <Input
                value={content}
                onChangeText={setContent}
                placeholder={t('posts.contentPlaceholder')}
                multiline
              />
              <Text variant="caption" color="fgSubtle">
                {content.length} / 200,000
              </Text>
            </Card>

            <Card level={0} style={{ gap: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="smallStrong">{t('posts.selectBooks')}</Text>
                <Text variant="caption" color="fgSubtle">
                  {selectedBooks.length} {t('list.bookCount', { count: selectedBooks.length })}
                </Text>
              </View>
              <Input
                value={bookSearch}
                onChangeText={setBookSearch}
                placeholder={t('posts.searchBooks')}
                icon={<Search size={16} color={theme.colors.fgSubtle} />}
                autoCapitalize="none"
              />

              {booksQuery.isLoading && bookSearch.length >= 2 ? (
                <View style={{ gap: theme.spacing.sm }}>
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} height={64} radius={theme.radius.md} />
                  ))}
                </View>
              ) : bookSearch.length >= 2 && searchBooks.length === 0 ? (
                <EmptyState
                  title={t('explore.noResults')}
                  hint={t('explore.noResultsHint')}
                />
              ) : bookSearch.length >= 2 ? (
                <View style={{ gap: theme.spacing.sm }}>
                  {searchBooks.slice(0, 6).map((book) => {
                    const picked = selectedBooks.some((p) => p.bookId === book.id);
                    return (
                      <Card
                        key={book.id}
                        level={1}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing.md,
                        }}
                      >
                        <BookCover title={book.title} uri={book.coverUrl} width={36} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="smallStrong" numberOfLines={1}>
                            {book.title}
                          </Text>
                          <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                            {book.authorName}
                          </Text>
                        </View>
                        <Chip
                          label={picked ? t('common.done') : t('common.add')}
                          selected={picked}
                          icon={picked ? <Check size={12} color={theme.colors.primary} /> : undefined}
                          onPress={() => (picked ? removeBook(book.id) : addBook(book))}
                        />
                      </Card>
                    );
                  })}
                </View>
              ) : null}

              {selectedBooks.length > 0 ? (
                <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
                  {selectedBooks.map((p) => {
                    const book = searchBooks.find((b) => b.id === p.bookId);
                    return (
                      <View
                        key={p.bookId}
                        style={{
                          flexDirection: 'row',
                          gap: theme.spacing.md,
                          alignItems: 'flex-start',
                        }}
                      >
                        <BookCover
                          title={book?.title ?? ''}
                          uri={book?.coverUrl ?? null}
                          width={44}
                        />
                        <View style={{ flex: 1, gap: theme.spacing.xs }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text variant="smallStrong" numberOfLines={1}>
                                {book?.title ?? p.bookId}
                              </Text>
                              {book ? (
                                <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                                  {book.authorName}
                                </Text>
                              ) : null}
                            </View>
                            <IconButton
                              label={t('common.delete')}
                              variant="subtle"
                              size={32}
                              onPress={() => removeBook(p.bookId)}
                            >
                              <X size={14} color={theme.colors.fg} />
                            </IconButton>
                          </View>
                          <Input
                            value={p.note ?? ''}
                            onChangeText={(v) => updateNote(p.bookId, v)}
                            placeholder={t('posts.addNote')}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>

            <Button
              variant="primary"
              size="lg"
              loading={create.isPending}
              disabled={!canPublish}
              onPress={handlePublish}
              title={t('posts.publish')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    </RoleGate>
  );
}
