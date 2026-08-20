import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, BookOpen, Edit2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { usePublication } from '@/api/hooks';
import { AppHeader } from '@/components/layout/AppHeader';
import { BookCover } from '@/components/book/BookCover';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Image } from 'expo-image';
import { formatDate } from '@/lib/format';
import type { Book } from '@/types';

export default function PublicationDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const query = usePublication(id ?? '', !!id);
  const { data, isLoading, error } = query;

  const isAuthor = useMemo(() => !!data && !!user && data.author.id === user.id, [data, user]);

  if (isLoading || !data) {
    return (
      <>
        <AppHeader back />
        <Screen>
          <Section>
            <Skeleton height={220} radius={theme.radius.lg} />
            <Skeleton height={28} radius={theme.radius.md} style={{ marginTop: 16 }} />
            <Skeleton height={14} radius={theme.radius.sm} />
            <Skeleton height={14} radius={theme.radius.sm} />
            <Skeleton height={14} radius={theme.radius.sm} />
          </Section>
        </Screen>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppHeader back />
        <Screen>
          <Section>
            <EmptyState
              title={t('common.error')}
              hint={t('common.tryAgain')}
              actionLabel={t('common.retry')}
              onAction={() => query.refetch()}
            />
          </Section>
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppHeader
        back
        right={
          isAdmin && isAuthor ? (
            <IconButton
              label={t('common.edit')}
              variant="card"
              onPress={() => router.push(`/admin/posts/${data.id}` as never)}
            >
              <Edit2 size={18} color={theme.colors.primary} />
            </IconButton>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.xl,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <View
            style={{
              width: '100%',
              aspectRatio: 16 / 10,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.subtle,
              overflow: 'hidden',
              marginBottom: theme.spacing.lg,
            }}
          >
            {data.coverUrl ? (
              <Image
                source={{ uri: data.coverUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.subtle,
                }}
              >
                <BookOpen size={40} color={theme.colors.fgSubtle} />
              </View>
            )}
          </View>

          <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>
            {data.title}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Avatar name={data.author.name} uri={data.author.avatarUrl} size={28} />
            <View style={{ flex: 1 }}>
              <Text variant="smallStrong">
                {t('posts.publishedBy', { name: data.author.name })}
              </Text>
              <Text variant="caption" color="fgSubtle">
                {t('posts.publishedOn', { date: formatDate(data.createdAt, locale) })}
                {data.updatedAt !== data.createdAt
                  ? ` · ${t('posts.updatedOn', { date: formatDate(data.updatedAt, locale) })}`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text variant="body" style={{ lineHeight: 26 }}>
            {data.content}
          </Text>
        </View>

        {data.recommendedBooks.length > 0 ? (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Card level={0} style={{ gap: theme.spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <BookOpen size={18} color={theme.colors.primary} />
                <Text variant="h3">{t('posts.recommended')}</Text>
                <Text variant="caption" color="fgSubtle">
                  ({data.recommendedBooks.length})
                </Text>
              </View>

              {data.recommendedBooks.map((r) => {
                const book = r.book as Book;
                return (
                  <Pressable
                    key={r.bookId}
                    accessibilityRole="button"
                    onPress={() => router.push(`/book/${book.id}` as never)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: theme.spacing.md,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <BookCover title={book.title} uri={book.coverUrl} width={72} />
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
                          {book.title}
                        </Text>
                        <ArrowRight size={16} color={theme.colors.fgSubtle} />
                      </View>
                      <Text variant="small" color="fgMuted" numberOfLines={1}>
                        {book.authorName}
                      </Text>
                      {r.note ? (
                        <Text
                          variant="small"
                          color="fgSubtle"
                          style={{
                            marginTop: theme.spacing.xs,
                            padding: theme.spacing.sm,
                            backgroundColor: theme.colors.subtle,
                            borderRadius: theme.radius.sm,
                            lineHeight: 20,
                          }}
                        >
                          {r.note}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
