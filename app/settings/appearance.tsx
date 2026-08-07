import React from 'react';
import { Pressable, View } from 'react-native';
import { Check, Monitor, Moon, Sun } from 'lucide-react-native';
import { THEME_NAMES, THEME_SWATCHES, useTheme, type ThemeName } from '@/theme';
import { LOCALES, useI18n } from '@/i18n';
import { usePrefs, type ThemeMode } from '@/store/prefs';
import { AppHeader } from '@/components/layout/AppHeader';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { BookCover } from '@/components/book/BookCover';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/Rating';

const MODES: {
  value: ThemeMode;
  labelKey: 'themeSystem' | 'themeLight' | 'themeDark';
  Icon: typeof Sun;
}[] = [
  { value: 'system', labelKey: 'themeSystem', Icon: Monitor },
  { value: 'light', labelKey: 'themeLight', Icon: Sun },
  { value: 'dark', labelKey: 'themeDark', Icon: Moon },
];

const PALETTE_LABELS: Record<ThemeName, { name: string; hint: string }> = {
  ink: { name: 'paletteInk', hint: 'paletteInkHint' },
  forest: { name: 'paletteForest', hint: 'paletteForestHint' },
  violet: { name: 'paletteViolet', hint: 'paletteVioletHint' },
};

export default function AppearanceSettingsScreen() {
  const theme = useTheme();
  const { t, locale, setLocale } = useI18n();
  const themeMode = usePrefs((s) => s.themeMode);
  const setThemeMode = usePrefs((s) => s.setThemeMode);
  const themeName = usePrefs((s) => s.themeName);
  const setThemeName = usePrefs((s) => s.setThemeName);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const setReduceMotion = usePrefs((s) => s.setReduceMotion);

  return (
    <>
      <AppHeader back title={t('settings.appearance')} />

      <Screen>
        {/* Live preview — the point of a palette picker is seeing the result. */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <BookCover title="Əli və Nino" authorName="Qurban Səid" width={64} />
          <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: 'center' }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              Əli və Nino
            </Text>
            <RatingStars value={9} size={14} count={6759} />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button title={t('book.addToShelf')} size="sm" variant="secondary" fullWidth={false} />
              <Button title={t('book.addToCart')} size="sm" fullWidth={false} />
            </View>
          </View>
        </View>

        <Section title={t('settings.palette')}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {THEME_NAMES.map((name) => {
              const swatches = THEME_SWATCHES[name][theme.scheme];
              const selected = themeName === name;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`settings.${PALETTE_LABELS[name].name}` as 'settings.paletteInk')}
                  onPress={() => setThemeName(name)}
                  style={{
                    flex: 1,
                    gap: theme.spacing.sm,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.card,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {swatches.map((color, i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: 28,
                          borderRadius: theme.radius.sm,
                          backgroundColor: color,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      />
                    ))}
                  </View>
                  <Text variant="smallStrong" numberOfLines={1}>
                    {t(`settings.${PALETTE_LABELS[name].name}` as 'settings.paletteInk')}
                  </Text>
                  <Text variant="caption" color="fgSubtle" numberOfLines={2}>
                    {t(`settings.${PALETTE_LABELS[name].hint}` as 'settings.paletteInkHint')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

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

        <Section title={t('settings.reading')}>
          <ListGroup>
            <ListRow
              title={t('settings.reduceMotion')}
              subtitle={t('settings.reduceMotionHint')}
              toggle={{ value: reduceMotion, onChange: setReduceMotion }}
            />
          </ListGroup>
        </Section>
      </Screen>
    </>
  );
}
