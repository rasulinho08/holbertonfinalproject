import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AtSign, Lock, User as UserIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import * as validate from '@/lib/validation';
import { useGoogleAuth } from '@/lib/googleAuth';
import { errorMessageKey, fieldErrors } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { AuthHeader, LocaleSwitch, SocialButtons } from '@/components/auth/AuthParts';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const register = useAuth((s) => s.register);
  const { signIn: googleSignIn } = useGoogleAuth();
  const loginWithProvider = useAuth((s) => s.loginWithProvider);

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const next = {
      name: validate.required(form.name),
      username: validate.username(form.username),
      email: validate.email(form.email),
      password: validate.password(form.password),
      confirm: validate.passwordsMatch(form.password, form.confirm),
    };
    setErrors(next);
    if (!validate.isValid(next)) return;

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        password: form.password,
      });
      // New accounts always go through the onboarding quiz first.
      router.replace('/onboarding');
    } catch (error) {
      // Field-level problems belong under the field. A toast tells the reader
      // something is wrong but not which box to fix, and the server's copy is
      // English — the wrong language for this app.
      const fields = fieldErrors(error);
      if (Object.keys(fields).length > 0) {
        setErrors((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.keys(fields).map((key) => [key, 'errors.validation'])),
        }));
      }
      const code = (error as { code?: string })?.code;
      if (code === 'USERNAME_TAKEN') setErrors((prev) => ({ ...prev, username: 'errors.usernameTaken' }));
      if (code === 'EMAIL_TAKEN') setErrors((prev) => ({ ...prev, email: 'errors.emailTaken' }));

      toast.error(t(errorMessageKey(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboardAware contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing['3xl'] }}>
      <LocaleSwitch />
      <AuthHeader title={t('auth.createAccount')} />

      <View style={{ gap: theme.spacing.md }}>
        <Input
          label={t('auth.fullName')}
          value={form.name}
          onChangeText={set('name')}
          error={errors.name ? t(errors.name) : undefined}
          autoComplete="name"
          icon={<UserIcon size={18} color={theme.colors.fgSubtle} />}
        />
        <Input
          label={t('auth.username')}
          value={form.username}
          onChangeText={(v) => set('username')(validate.toUsername(v))}
          error={errors.username ? t(errors.username) : undefined}
          autoCapitalize="none"
          placeholder="kitabsever"
          icon={<Text color="fgSubtle">@</Text>}
        />
        <Input
          label={t('auth.email')}
          value={form.email}
          onChangeText={set('email')}
          error={errors.email ? t(errors.email) : undefined}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          icon={<AtSign size={18} color={theme.colors.fgSubtle} />}
        />
        <Input
          label={t('auth.password')}
          value={form.password}
          onChangeText={set('password')}
          error={errors.password ? t(errors.password) : undefined}
          password
          autoComplete="new-password"
          icon={<Lock size={18} color={theme.colors.fgSubtle} />}
        />
        <Input
          label={t('auth.confirmPassword')}
          value={form.confirm}
          onChangeText={set('confirm')}
          error={errors.confirm ? t(errors.confirm) : undefined}
          password
          icon={<Lock size={18} color={theme.colors.fgSubtle} />}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
      </View>

      <Button title={t('auth.register')} loading={busy} onPress={submit} />

      <SocialButtons
        disabled={busy}
        onPress={async (provider) => {
          if (provider !== 'google') return;
          setBusy(true);
          try {
            const result = await googleSignIn();
            // null means the consent screen was dismissed — not an error.
            if (!result) return;
            await loginWithProvider('google', result.idToken);
            router.replace('/onboarding');
          } catch (error) {
            toast.error(t(errorMessageKey(error)));
          } finally {
            setBusy(false);
          }
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xs }}>
        <Text variant="small" color="fgMuted">
          {t('auth.haveAccount')}
        </Text>
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link">
            <Text variant="smallStrong" color="primary">
              {t('auth.login')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
