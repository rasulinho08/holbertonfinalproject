import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  Bell,
  BookPlus,
  Heart,
  MessageCircle,
  Target,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, type TranslationKey } from '@/i18n';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { formatRelative } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import type { AppNotification, NotificationType } from '@/types';

const ICONS: Record<NotificationType, typeof Bell> = {
  follow: UserPlus,
  new_book: BookPlus,
  order_shipped: Truck,
  review_comment: MessageCircle,
  quote_like: Heart,
  buddy_invite: Users,
  goal_reached: Target,
  badge_earned: Award,
};

const MESSAGE_KEYS: Record<NotificationType, TranslationKey> = {
  follow: 'notifications.typeFollow',
  new_book: 'notifications.typeNewBook',
  order_shipped: 'notifications.typeOrderShipped',
  review_comment: 'notifications.typeReviewComment',
  quote_like: 'notifications.typeQuoteLike',
  buddy_invite: 'notifications.typeBuddyInvite',
  goal_reached: 'notifications.typeGoalReached',
  badge_earned: 'notifications.typeBadge',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data: notifications, isLoading, refetch } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const hasUnread = notifications?.some((n) => !n.read) ?? false;

  const open = (notification: AppNotification) => {
    if (!notification.read) markOne.mutate(notification.id);
    if (notification.link) router.push(notification.link as never);
  };

  return (
    <>
      <AppHeader
        back
        title={t('notifications.title')}
        right={
          hasUnread ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => markAll.mutate()}
              style={{ paddingHorizontal: 4 }}
            >
              <Text variant="caption" color="primary">
                {t('notifications.markAllRead')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.xs,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        renderItem={({ item }) => {
          const Icon = ICONS[item.type];
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: pressed
                  ? theme.colors.subtle
                  : item.read
                    ? 'transparent'
                    : theme.colors.primarySoft,
              })}
            >
              {item.actor ? (
                <Avatar name={item.actor.name} uri={item.actor.avatarUrl} size={40} />
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.subtle,
                  }}
                >
                  <Icon size={18} color={theme.colors.fgMuted} />
                </View>
              )}

              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="small" numberOfLines={2}>
                  {t(MESSAGE_KEYS[item.type], item.params)}
                </Text>
                <Text variant="caption" color="fgSubtle">
                  {formatRelative(item.createdAt, locale)}
                </Text>
              </View>

              {!item.read ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.sm }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={62} radius={theme.radius.md} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Bell size={22} color={theme.colors.fgSubtle} />}
              title={t('notifications.empty')}
            />
          )
        }
      />
    </>
  );
}
