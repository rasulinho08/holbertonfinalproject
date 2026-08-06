import React from 'react';
import { View } from 'react-native';
import { Check, Monitor, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { LOCALES, useI18n } from '@/i18n';
import { usePrefs, type ThemeMode } from '@/store/prefs';
import { AppHeader } from '@/components/layout/AppHeader';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

const MODES: { value: ThemeMode; labelKey: 'themeSystem' | 'themeLight' | 'themeDark'; Icon: typeof Sun }[] = [
  { value: 'system', labelKey: 'themeSystem', Icon: Monitor },
  { value: 'light', labelKey: 'themeLight', Icon: Sun },
  { value: 'dark', labelKey: 'themeDark', Icon: Moon },
];

export default function AppearanceSettingsScreen() {
  const theme = useTheme();
  const { t, locale, setLocale } = useI18n();
  const themeMode = usePrefs((s) => s.themeMode);
  const setThemeMode = usePrefs((s) => s.setThemeMode);

  return (
    <>
      <AppHeader back title={t('settings.appearance')} />

      <Screen>
        <Section title={t('settings.theme')}>
          <ListGroup>
            {MODES.map(({ value, labelKey, Icon }) => (
              <ListRow
                key={value}
                title={t(`settings.${labelKey}`)}
                icon={<Icon size={16} color={theme.colors.fgMuted} />}
                onPress={() => setThemeMode(value)}
                right={
                  themeMode === value ? (
                    <Check size={18} color={theme.colors.primary} />
                  ) : (
                    <View style={{ width: 18 }} />
                  )
                }
              />
            ))}
          </ListGroup>
          <Text variant="small" color="fgSubtle">
            {t('settings.themeSystem')} — {theme.isDark ? t('settings.themeDark') : t('settings.themeLight')}
          </Text>
        </Section>

        <Section title={t('settings.language')}>
          <ListGroup>
            {LOCALES.map((code) => (
              <ListRow
                key={code}
                title={code === 'az' ? t('settings.languageAz') : t('settings.languageEn')}
                onPress={() => setLocale(code)}
                right={
                  locale === code ? (
                    <Check size={18} color={theme.colors.primary} />
                  ) : (
                    <View style={{ width: 18 }} />
                  )
                }
              />
            ))}
          </ListGroup>
        </Section>
      </Screen>
    </>
  );
}
