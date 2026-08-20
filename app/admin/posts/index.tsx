import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Edit2, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import {
  useAdminPublications,
  useDeletePublication,
} from '@/api/hooks';
import type { PublicationSummary } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/format';
import { Image } from 'expo-image';

const NEW_ROUTE = '/admin/posts/new' as const;

export default function AdminPublicationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading, error, refetch } = useAdminPublications(isAdmin);
  const { mutateAsync: remove, isPending: removingGlobal } = useDeletePublication();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function confirmDelete(post: PublicationSummary) {
    const message = t('posts.deleteConfirm', { title: post.title });
    const runDelete = async () => {
      setRemovingId(post.id);
      try {
        await remove(post.id);
      } catch (error) {
        const msg =
          error && typeof (error as { message?: string }).message === 'string'
            ? (error as { message: string }).message
            : t('common.error');
        if (Platform.OS === 'web') {
          // eslint-disable-next-line no-alert
          window.alert(msg);
        } else {
          Alert.alert(t('common.error'), msg);
        }
      } finally {
        setRemovingId(null);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`${t('common.delete')} — ${message}`)) {
        void runDelete();
      }
      return;
    }

    Alert.alert(t('common.delete'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void runDelete(),
      },
    ]);
  }

  return (
    <RoleGate role="admin">
      <>
        <AppHeader
          back
          title={t('posts.title')}
          subtitle={t('admin.overview')}
          right={
            <IconButton
              label={t('posts.create')}
              variant="card"
              onPress={() => router.push(NEW_ROUTE as never)}
            >
              <Plus size={18} color={theme.colors.primary} />
            </IconButton>
          }
        />

        <Screen>
          <Section>
            <Card level={0} style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <Text variant="h3">{t('posts.title')}</Text>
                  <Text variant="caption" color="fgSubtle">
                    {t('posts.emptyHint')}
                  </Text>
                </View>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} color={theme.colors.primaryFg} />}
                  onPress={() => router.push(NEW_ROUTE as never)}
                  title={t('posts.create')}
                />
              </View>
            </Card>
          </Section>

          {isLoading || !data ? (
            <Section>
              <View style={{ gap: theme.spacing.md }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={110} radius={theme.radius.lg} />
                ))}
              </View>
            </Section>
          ) : error ? (
            <Section>
              <EmptyState
                title={t('common.error')}
                hint={t('common.tryAgain')}
                actionLabel={t('common.retry')}
                onAction={() => void refetch()}
              />
            </Section>
          ) : data.length === 0 ? (
            <Section>
              <EmptyState
                icon={<Plus size={22} color={theme.colors.fgSubtle} />}
                title={t('posts.empty')}
                hint={t('posts.emptyHint')}
                actionLabel={t('posts.create')}
                onAction={() => router.push(NEW_ROUTE as never)}
              />
            </Section>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              contentContainerStyle={{ gap: theme.spacing.md }}
              renderItem={({ item }) => (
                <Card level={0} style={{ gap: theme.spacing.md }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/post/${item.id}` as never)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: theme.spacing.md,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 100,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.subtle,
                        overflow: 'hidden',
                      }}
                    >
                      {item.coverUrl ? (
                        <Image
                          source={{ uri: item.coverUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text variant="small" color="fgMuted" numberOfLines={2}>
                        {item.excerpt}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                          marginTop: 2,
                        }}
                      >
                        <Avatar
                          name={item.author.name}
                          uri={item.author.avatarUrl}
                          size={16}
                        />
                        <Text variant="caption" color="fgSubtle">
                          {t('posts.publishedOn', { date: formatDate(item.createdAt, locale) })}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: theme.spacing.sm,
                      justifyContent: 'flex-end',
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      paddingTop: theme.spacing.sm,
                    }}
                  >
                    <IconButton
                      label={t('common.edit')}
                      variant="card"
                      size={40}
                      onPress={() => router.push(`/admin/posts/${item.id}` as never)}
                    >
                      <Edit2 size={16} color={theme.colors.fg} />
                    </IconButton>
                    <IconButton
                      label={t('common.delete')}
                      variant="card"
                      size={40}
                      onPress={() => confirmDelete(item)}
                    >
                      <Trash2 size={16} color={theme.colors.danger} />
                    </IconButton>
                  </View>
                </Card>
              )}
            />
          )}
        </Screen>
      </>
    </RoleGate>
  );
}
