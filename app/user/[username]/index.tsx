import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useUser } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { ProfileView } from '@/components/profile/ProfileView';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';

export default function UserProfileScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { username } = useLocalSearchParams<{ username: string }>();

  const me = useCurrentUser();
  const { data: user, isLoading, refetch } = useUser(username);
  const { refreshing, onRefresh } = useRefresh(refetch);

  return (
    <>
      <AppHeader back title={user?.name ?? ''} actions />

      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        {isLoading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={80} radius={theme.radius.lg} />
            <Skeleton height={70} radius={theme.radius.lg} />
            <Skeleton height={180} radius={theme.radius.lg} />
          </View>
        ) : !user ? (
          <EmptyState title={t('errors.notFound')} hint={t('errors.notFoundHint')} />
        ) : (
          <ProfileView user={user} isMe={user.id === me?.id} />
        )}
      </Screen>
    </>
  );
}
