import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AtSign, MailCheck } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';
import * as validate from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AuthHeader } from '@/components/auth/AuthParts';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<validate.FieldError>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const next = validate.email(email);
    setError(next);
    if (next) return;

    setBusy(true);
    try {
      await api.post(Endpoints.auth.forgotPassword, { email: email.trim() }, { auth: false });
      setSent(true);
    } finally {
      // The response is intentionally identical whether or not the address
      // exists, so this screen never leaks which emails are registered.
      setSent(true);
      setBusy(false);
    }
  };

  return (
    <Screen keyboardAware contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing['2xl'] }}>
      <IconButton label={t('common.back')} onPress={() => router.back()} variant="subtle">
        <ArrowLeft size={20} color={theme.colors.fg} />
      </IconButton>

      <AuthHeader title={t('auth.resetPassword')} subtitle={t('auth.resetHint')} />

      {sent ? (
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.successSoft,
          }}
        >
          <MailCheck size={28} color={theme.colors.success} />
          <Text variant="bodyStrong" center style={{ color: theme.colors.success }}>
            {t('auth.resetSent')}
          </Text>
          <Button title={t('auth.login')} variant="secondary" onPress={() => router.replace('/login')} />
        </View>
      ) : (
        <>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            error={error ? t(error) : undefined}
            autoCapitalize="none"
            keyboardType="email-address"
            icon={<AtSign size={18} color={theme.colors.fgSubtle} />}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          <Button title={t('auth.resetPassword')} loading={busy} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
