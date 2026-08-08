import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, MessageSquare, Quote, ShieldCheck, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useAdminStats } from '@/api/hooks';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function AdminDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const { data: stats, isLoading } = useAdminStats(isAdmin);

  if (!isAdmin) {
    return (
      <>
        <AppHeader back title={t('admin.title')} />
        <Screen>
          <EmptyState
            icon={<ShieldCheck size={22} color={theme.colors.fgSubtle} />}
            title={t('errors.forbidden')}
            hint={t('errors.forbiddenAdmin')}
            actionLabel={t('settings.title')}
            onAction={() => router.push('/settings')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppHeader back title={t('admin.title')} subtitle={t('admin.overview')} />

      <Screen>
        {isLoading || !stats ? (
          <Skeleton height={110} radius={theme.radius.lg} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            <Metric label={t('admin.openReports')} value={stats.openReports} tone="warning" />
            <Metric label={t('admin.removedContent')} value={stats.removedContent} tone="danger" />
            <Metric label={t('admin.activeUsers')} value={stats.activeUsers} />
            <Metric label={t('profile.followers')} value={stats.newUsersThisWeek} />
          </View>
        )}

        <Section title={t('admin.title')}>
          <ListGroup>
            <ListRow
              title={t('admin.reports')}
              value={stats ? String(stats.openReports) : undefined}
              icon={<Flag size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/reports')}
            />
            <ListRow
              title={t('admin.reviews')}
              icon={<MessageSquare size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/reviews')}
            />
            <ListRow
              title={t('admin.quotes')}
              icon={<Quote size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/quotes')}
            />
            <ListRow
              title={t('game.leaderboard')}
              icon={<Users size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/leaderboard')}
            />
          </ListGroup>
        </Section>
      </Screen>
    </>
  );
}

function Metric({
  label,
  value,
  tone = 'fg',
}: {
  label: string;
  value: number;
  tone?: 'fg' | 'warning' | 'danger';
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        gap: 4,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text variant="h1" color={tone === 'fg' ? 'fg' : tone}>
        {value}
      </Text>
      <Text variant="caption" color="fgSubtle" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
