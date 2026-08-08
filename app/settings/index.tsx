import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Bell,
  EyeOff,
  Globe,
  LogOut,
  Palette,
  ShieldCheck,
  Trash2,
  UserCog,
  Wifi,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth, useCurrentUser } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { API_BASE_URL } from '@/api/config';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';


export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const logout = useAuth((s) => s.logout);

  const dataSaver = usePrefs((s) => s.dataSaver);
  const setDataSaver = usePrefs((s) => s.setDataSaver);
  const hideSpoilers = usePrefs((s) => s.hideSpoilers);
  const setHideSpoilers = usePrefs((s) => s.setHideSpoilers);

  const [signingOut, setSigningOut] = useState(false);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <>
      <AppHeader back title={t('settings.title')} />

      <Screen>
        <ListGroup title={t('settings.account')}>
          <ListRow
            title={t('settings.editProfile')}
            subtitle={user ? `@${user.username}` : undefined}
            icon={<UserCog size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow
            title={t('settings.security')}
            subtitle={t('settings.twoFactorHint')}
            icon={<ShieldCheck size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/settings/security')}
          />
        </ListGroup>

        <ListGroup title={t('settings.appearance')}>
          <ListRow
            title={t('settings.theme')}
            icon={<Palette size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/settings/appearance')}
          />
          <ListRow
            title={t('settings.language')}
            value={locale === 'az' ? t('settings.languageAz') : t('settings.languageEn')}
            icon={<Globe size={16} color={theme.colors.fgMuted} />}
            onPress={() => setLocale(locale === 'az' ? 'en' : 'az')}
          />
        </ListGroup>

        <ListGroup title={t('settings.reading')}>
          <ListRow
            title={t('settings.hideSpoilers')}
            subtitle={t('settings.hideSpoilersHint')}
            icon={<EyeOff size={16} color={theme.colors.fgMuted} />}
            toggle={{ value: hideSpoilers, onChange: setHideSpoilers }}
          />
          <ListRow
            title={t('settings.dataSaver')}
            subtitle={t('settings.dataSaverHint')}
            icon={<Wifi size={16} color={theme.colors.fgMuted} />}
            toggle={{ value: dataSaver, onChange: setDataSaver }}
          />
          <ListRow
            title={t('settings.notifications')}
            icon={<Bell size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/notifications')}
          />
        </ListGroup>

        {/*
          The role now comes from the account, as it does in production: the
          seeded publisher@ and admin@ logins reach the publisher and moderation
          panels. The demo role switch that used to live here talked to a
          mock-only endpoint and has gone with the mock.
        */}

        <ListGroup title={t('settings.about')}>
          <ListRow title={t('settings.version')} value={version} />
          <ListRow
            title={t('settings.apiModeServer')}
            value={API_BASE_URL}
          />
        </ListGroup>

        <ListGroup>
          <ListRow
            title={t('auth.signOut')}
            icon={<LogOut size={16} color={theme.colors.danger} />}
            destructive
            onPress={() => setSigningOut(true)}
          />
          <ListRow
            title={t('settings.deleteAccount')}
            icon={<Trash2 size={16} color={theme.colors.danger} />}
            destructive
            onPress={() => toast.info(t('common.comingSoon'))}
          />
        </ListGroup>
      </Screen>

      <Sheet visible={signingOut} onClose={() => setSigningOut(false)} title={t('auth.signOut')}>
        <Text variant="body" color="fgMuted">
          {t('auth.signOutConfirm')}
        </Text>
        <Button
          title={t('auth.signOut')}
          variant="danger"
          onPress={async () => {
            setSigningOut(false);
            await logout();
            router.replace('/login');
          }}
        />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setSigningOut(false)} />
      </Sheet>
    </>
  );
}
