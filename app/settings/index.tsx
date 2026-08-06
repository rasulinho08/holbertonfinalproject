import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  BarChart3,
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
import { USE_MOCK_API } from '@/api/config';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { UserRole } from '@/types';

const ROLES: UserRole[] = ['user', 'publisher', 'admin'];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const logout = useAuth((s) => s.logout);
  const setDemoRole = useAuth((s) => s.setDemoRole);

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
          Demo-only role switch. The real backend derives the role from the
          account, but a single demo login has to be able to show the reader,
          publisher and moderator experiences during the sprint review.
        */}
        {USE_MOCK_API ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="caption" color="fgSubtle">
              DEMO
            </Text>
            <View
              style={{
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <BarChart3 size={16} color={theme.colors.fgMuted} />
                <Text variant="small" color="fgMuted" style={{ flex: 1 }}>
                  {t('settings.apiModeMock')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                {ROLES.map((role) => (
                  <Chip
                    key={role}
                    label={
                      role === 'user'
                        ? t('nav.profile')
                        : role === 'publisher'
                          ? t('nav.publisher')
                          : t('nav.admin')
                    }
                    selected={user?.role === role}
                    onPress={async () => {
                      await setDemoRole(role);
                      toast.success(role);
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <ListGroup title={t('settings.about')}>
          <ListRow title={t('settings.version')} value={version} />
          <ListRow
            title={t('settings.apiMode')}
            value={USE_MOCK_API ? t('settings.apiModeMock') : t('settings.apiModeLive')}
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
