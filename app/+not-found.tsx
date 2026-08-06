import React from 'react';
import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function NotFoundScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState
        icon={<Compass size={24} color={theme.colors.fgSubtle} />}
        title={t('errors.notFound')}
        hint={t('errors.notFoundHint')}
        actionLabel={t('nav.home')}
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
