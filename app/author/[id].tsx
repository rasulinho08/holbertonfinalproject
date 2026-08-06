import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuthor, useAuthorBooks } from '@/api/hooks';
import { formatCount } from '@/lib/format';
import { BookListItem } from '@/components/book/BookListItem';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton, SkeletonLines } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function AuthorScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: author, isLoading } = useAuthor(id);
  const { data: books, isLoading: booksLoading } = useAuthorBooks(id);

  return (
    <>
      <AppHeader back title={author?.name} actions />

      <Screen>
        {isLoading || !author ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={90} radius={theme.radius.lg} />
            <SkeletonLines count={3} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              <Avatar name={author.name} uri={author.photoUrl} size={72} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="h1" numberOfLines={2}>
                  {author.name}
                </Text>
                <Text variant="small" color="fgSubtle">
                  {t('shelf.booksCount', { count: author.bookCount })} ·{' '}
                  {formatCount(author.followersCount)} {t('profile.followers')}
                </Text>
              </View>
            </View>

            {author.bio ? (
              <Section title={t('book.aboutAuthor')}>
                <Card level={0}>
                  <Text variant="body" color="fgMuted">
                    {author.bio}
                  </Text>
                </Card>
              </Section>
            ) : null}
          </>
        )}

        <Section title={t('book.otherBooks')}>
          {booksLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={100} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {(books ?? []).map((book) => (
                <BookListItem key={book.id} book={book} />
              ))}
            </View>
          )}
        </Section>
      </Screen>
    </>
  );
}
