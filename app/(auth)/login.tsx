import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AtSign, Lock } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import * as validate from '@/lib/validation';
import { useGoogleAuth } from '@/lib/googleAuth';
import { errorMessageKey } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { AuthHeader, LocaleSwitch, SocialButtons } from '@/components/auth/AuthParts';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const login = useAuth((s) => s.login);
  const loginWithProvider = useAuth((s) => s.loginWithProvider);
  const onboardingDone = usePrefs((s) => s.onboardingDone);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = {
      email: validate.email(email),
      password: validate.password(password),
    };
    setErrors(next);
    if (!validate.isValid(next)) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(onboardingDone ? '/' : '/onboarding');
    } catch (error) {
      toast.error(t(errorMessageKey(error)));
    } finally {
      setBusy(false);
    }
  };

  const { signIn: googleSignIn } = useGoogleAuth();

  const social = async (provider: 'google' | 'apple' | 'facebook') => {
    if (provider !== 'google') return;
    setBusy(true);
    try {
      const result = await googleSignIn();
      // null means the reader closed the consent screen — not an error.
      if (!result) return;
      await loginWithProvider('google', result.idToken);
      router.replace(onboardingDone ? '/' : '/onboarding');
    } catch (error) {
      toast.error(t(errorMessageKey(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboardAware contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing['3xl'] }}>
      <LocaleSwitch />
      <AuthHeader title={t('auth.welcomeTitle')} subtitle={t('auth.welcomeSubtitle')} />

      <View style={{ gap: theme.spacing.md }}>
        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? t(errors.email) : undefined}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="ad@example.com"
          icon={<AtSign size={18} color={theme.colors.fgSubtle} />}
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          error={errors.password ? t(errors.password) : undefined}
          password
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock size={18} color={theme.colors.fgSubtle} />}
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" style={{ alignSelf: 'flex-end' }}>
            <Text variant="smallStrong" color="primary">
              {t('auth.forgotPassword')}
            </Text>
          </Pressable>
        </Link>
      </View>

      <Button title={t('auth.login')} loading={busy} onPress={submit} />

      <Text variant="caption" color="fgSubtle" center>
        {t('auth.demoHint')}
      </Text>

      <SocialButtons onPress={social} disabled={busy} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xs }}>
        <Text variant="small" color="fgMuted">
          {t('auth.noAccount')}
        </Text>
        <Link href="/register" asChild>
          <Pressable accessibilityRole="link">
            <Text variant="smallStrong" color="primary">
              {t('auth.register')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
