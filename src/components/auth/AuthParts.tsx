import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BookOpen, Building2, PenLine } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { LOCALES, useI18n } from '@/i18n';
import type { AccountType } from '@/types';
import { isGoogleConfigured } from '@/lib/googleAuth';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

/**
 * Wordmark + copy shared by the sign-in, sign-up and reset screens.
 *
 * QA could not read the heading: it was brand-coloured `display` text sitting
 * directly on the page background. `primary` is tuned to carry a filled button,
 * where it is the *background* behind white — as a text colour on the page it
 * lands near 4.5:1 in light mode, which is the floor rather than a margin, and
 * it looked washed out next to nothing.
 *
 * So the heading now uses `fg` (7:1 against any of the six palettes) and sits
 * on a tinted panel that separates it from the form below. The brand colour
 * moves to the wordmark and the rule under it, where it decorates instead of
 * carrying the text.
 */
export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        padding: theme.spacing.xl,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.primarySoft,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Logo size={38} />
        <Text variant="h2" color="primarySoftFg">
          KitabDostu
        </Text>
      </View>

      <Text variant="display" style={{ marginTop: theme.spacing.xs }}>
        {title}
      </Text>

      {/* A short brand rule instead of brand-coloured text: the accent is still
          present, but it is no longer the thing the reader has to decipher. */}
      <View
        style={{
          width: 48,
          height: 3,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      />

      {subtitle ? (
        <Text variant="body" color="fgMuted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Reader / Writer / Publisher, picked at sign-up.
 *
 * Stacked rows rather than a segmented control: each option needs a sentence
 * explaining what the account can do, and three labels squeezed onto one line
 * would say "Writer" without ever saying what choosing it means. The choice
 * decides which extra fields appear below, so getting it wrong is expensive.
 */
export function AccountTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: AccountType;
  onChange: (next: AccountType) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  const options: { key: AccountType; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      key: 'reader',
      label: t('auth.accountTypeReader'),
      hint: t('auth.accountTypeReaderHint'),
      icon: <BookOpen size={20} color={theme.colors.primary} />,
    },
    {
      key: 'author',
      label: t('auth.accountTypeAuthor'),
      hint: t('auth.accountTypeAuthorHint'),
      icon: <PenLine size={20} color={theme.colors.primary} />,
    },
    {
      key: 'publisher',
      label: t('auth.accountTypePublisher'),
      hint: t('auth.accountTypePublisherHint'),
      icon: <Building2 size={20} color={theme.colors.primary} />,
    },
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="caption" color="fgSubtle">
        {t('auth.accountTypeTitle').toUpperCase()}
      </Text>

      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !!disabled }}
            accessibilityLabel={`${option.label}. ${option.hint}`}
            disabled={disabled}
            onPress={() => onChange(option.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected ? theme.colors.primarySoft : theme.colors.card,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {option.icon}

            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text variant="bodyStrong">{option.label}</Text>
              <Text variant="small" color="fgMuted">
                {option.hint}
              </Text>
            </View>

            {/* A filled dot, not a tick: this is one-of-three, and a tick reads
                as a checkbox the reader could tick more than one of. */}
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The open-book mark, drawn inline so it scales and follows the theme. */
export function Logo({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="KitabDostu">
      <Rect width={32} height={32} rx={9} fill={theme.colors.primary} />
      <Path
        d="M6 10.5c3.2-1.4 6-1.4 9 .2v13c-3-1.6-5.8-1.6-9-.2v-13z"
        fill={theme.colors.primaryFg}
        opacity={0.95}
      />
      <Path
        d="M26 10.5c-3.2-1.4-6-1.4-9 .2v13c3-1.6 5.8-1.6 9-.2v-13z"
        fill={theme.colors.primaryFg}
        opacity={0.8}
      />
      <Circle cx={16} cy={17} r={1.1} fill={theme.colors.primary} />
    </Svg>
  );
}

/** AZ / EN toggle, available before sign-in so the app opens in the right language. */
export function LocaleSwitch() {
  const theme = useTheme();
  const { locale, setLocale } = useI18n();

  return (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-end', gap: 4 }}>
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={code.toUpperCase()}
            onPress={() => setLocale(code)}
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: 6,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.colors.primarySoft : 'transparent',
            }}
          >
            <Text variant="caption" color={active ? 'primary' : 'fgSubtle'}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Social sign-in.
 *
 * Only providers that are actually configured are rendered. Apple needs a paid
 * developer account and only works on iOS; Facebook needs app review before it
 * will release an email address. Showing their buttons anyway would mean three
 * buttons of which two always fail — worse than one that works.
 *
 * Returns null entirely when nothing is configured, so the divider does not
 * hang above an empty space.
 */
export function SocialButtons({
  onPress,
  disabled,
}: {
  onPress: (provider: 'google' | 'apple' | 'facebook') => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  if (!isGoogleConfigured) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        <Text variant="small" color="fgSubtle">
          {t('auth.or')}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      </View>

      <Button
        title={t('auth.continueWithGoogle')}
        variant="outline"
        disabled={disabled}
        icon={<ProviderMark provider="google" />}
        onPress={() => onPress('google')}
      />
    </View>
  );
}

function ProviderMark({ provider }: { provider: 'google' | 'apple' | 'facebook' }) {
  const theme = useTheme();

  if (provider === 'google') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          fill="#4285F4"
          d="M23 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.17a5.28 5.28 0 0 1-2.29 3.46v2.88h3.7C21.74 18.8 23 15.8 23 12.27z"
        />
        <Path
          fill="#34A853"
          d="M12 23.5c3.1 0 5.7-1.03 7.59-2.79l-3.7-2.88c-1.03.69-2.34 1.1-3.89 1.1-2.99 0-5.53-2.02-6.43-4.74H1.73v2.97A11.49 11.49 0 0 0 12 23.5z"
        />
        <Path
          fill="#FBBC05"
          d="M5.57 14.19a6.9 6.9 0 0 1 0-4.38V6.84H1.73a11.5 11.5 0 0 0 0 10.32l3.84-2.97z"
        />
        <Path
          fill="#EA4335"
          d="M12 5.07c1.69 0 3.2.58 4.39 1.72l3.28-3.28C17.7 1.63 15.1.5 12 .5A11.49 11.49 0 0 0 1.73 6.84l3.84 2.97C6.47 7.09 9.01 5.07 12 5.07z"
        />
      </Svg>
    );
  }

  if (provider === 'apple') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          fill={theme.colors.fg}
          d="M16.4 12.7c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.7 2.9-.4 7.1 1.2 9.4.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.7-3.8zM14.3 5.3c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </Svg>
  );
}
