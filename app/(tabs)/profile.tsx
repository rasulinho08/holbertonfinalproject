import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  BarChart3,
  Package,
  Settings as SettingsIcon,
  ShieldCheck,
  Trophy,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth, useCurrentUser } from '@/store/auth';
import { useUser } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { ProfileView } from '@/components/profile/ProfileView';
import { AppHeader } from '@/components/layout/AppHeader';
import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProfileTab() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const cached = useCurrentUser();
  const refreshAuth = useAuth((s) => s.refresh);
  const { data, isLoading, refetch } = useUser(cached?.username);
  const { refreshing, onRefresh } = useRefresh(async () => {
    await Promise.all([refetch(), refreshAuth()]);
  });

  const user = data ?? cached;

  return (
    <>
      <AppHeader
        title={t('nav.profile')}
        actions
        right={
          <IconButton label={t('settings.title')} onPress={() => router.push('/settings')}>
            <SettingsIcon size={21} color={theme.colors.fg} />
          </IconButton>
        }
      />

      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        {!user || isLoading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={80} radius={theme.radius.lg} />
            <Skeleton height={70} radius={theme.radius.lg} />
            <Skeleton height={180} radius={theme.radius.lg} />
          </View>
        ) : (
          <>
            <ProfileView user={user} isMe />

            <ListGroup>
              <ListRow
                title={t('order.title')}
                icon={<Package size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/orders')}
              />
              <ListRow
                title={t('game.leaderboard')}
                icon={<Trophy size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/leaderboard')}
              />
              <ListRow
                title={t('game.badges')}
                icon={<Award size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/badges')}
              />
              {user.role === 'publisher' ? (
                <ListRow
                  title={t('publisher.title')}
                  icon={<BarChart3 size={16} color={theme.colors.fgMuted} />}
                  onPress={() => router.push('/publisher')}
                />
              ) : null}
              {user.role === 'admin' ? (
                <ListRow
                  title={t('admin.title')}
                  icon={<ShieldCheck size={16} color={theme.colors.fgMuted} />}
                  onPress={() => router.push('/admin')}
                />
              ) : null}
              <ListRow
                title={t('settings.title')}
                icon={<SettingsIcon size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/settings')}
              />
            </ListGroup>
          </>
        )}
      </Screen>
    </>
  );
}
