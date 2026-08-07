import React from 'react';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import type { UserRole } from '@/types';

export interface RoleGateProps {
  role: UserRole;
  children: React.ReactNode;
}

/**
 * Guards the publisher and admin areas.
 *
 * Those screens gate their queries on the viewer's role (`enabled: isAdmin`).
 * A disabled query never resolves, so `data` stays undefined forever and a
 * screen written as `isLoading || !data ? <Skeleton/> : …` renders a skeleton
 * that never finishes — which is exactly what a reader opening `/admin/reviews`
 * by URL used to see. Gating the whole screen instead states the reason, and
 * points at the role switcher that can change it.
 */
export function RoleGate({ role, children }: RoleGateProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const user = useCurrentUser();

  if (user?.role === role) return <>{children}</>;

  return (
    <Screen>
      <EmptyState
        icon={<Lock size={22} color={theme.colors.fgSubtle} />}
        title={t('errors.forbidden')}
        hint={t(role === 'admin' ? 'errors.forbiddenAdmin' : 'errors.forbiddenPublisher')}
        actionLabel={t('settings.title')}
        onAction={() => router.push('/settings')}
      />
    </Screen>
  );
}
