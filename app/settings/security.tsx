import React, { useState } from 'react';
import { View } from 'react-native';
import { KeyRound, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth, useCurrentUser } from '@/store/auth';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';
import * as validate from '@/lib/validation';
import { serverMessage } from '@/api/errors';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen, Section } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function SecuritySettingsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const refresh = useAuth((s) => s.refresh);

  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});

  const enabled = user?.twoFactorEnabled ?? false;

  const startTwoFactor = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await api.post(Endpoints.auth.twoFactorDisable);
        await refresh();
        toast.success(t('settings.twoFactor'));
      } else {
        const result = await api.post<{ secret: string }>(Endpoints.auth.twoFactorEnable);
        setSecret(result.secret);
        setTwoFactorOpen(true);
      }
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const verifyTwoFactor = async () => {
    setBusy(true);
    try {
      await api.post(Endpoints.auth.twoFactorVerify, { code });
      await refresh();
      setTwoFactorOpen(false);
      setCode('');
      toast.success(t('settings.twoFactor'));
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    const validated = {
      current: validate.required(current),
      next: validate.password(next),
    };
    setErrors(validated);
    if (!validate.isValid(validated)) return;

    setBusy(true);
    try {
      await api.post(Endpoints.auth.changePassword, {
        currentPassword: current,
        newPassword: next,
      });
      setPasswordOpen(false);
      setCurrent('');
      setNext('');
      toast.success(t('settings.changePassword'));
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader back title={t('settings.security')} />

      <Screen>
        <ListGroup>
          <ListRow
            title={t('settings.twoFactor')}
            subtitle={t('settings.twoFactorHint')}
            icon={<ShieldCheck size={16} color={theme.colors.fgMuted} />}
            toggle={{ value: enabled, onChange: startTwoFactor }}
          />
          <ListRow
            title={t('settings.changePassword')}
            icon={<KeyRound size={16} color={theme.colors.fgMuted} />}
            onPress={() => setPasswordOpen(true)}
          />
        </ListGroup>

        <Section title={t('settings.about')}>
          <Card level={0}>
            <Text variant="small" color="fgMuted">
              {t('auth.twoFactorHint')}
            </Text>
          </Card>
        </Section>
      </Screen>

      <Sheet
        visible={twoFactorOpen}
        onClose={() => setTwoFactorOpen(false)}
        title={t('auth.twoFactorTitle')}
      >
        <Text variant="small" color="fgMuted">
          {t('auth.twoFactorHint')}
        </Text>

        {/* The authenticator secret; a production build also renders a QR code. */}
        {secret ? (
          <View
            style={{
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.subtle,
              alignItems: 'center',
            }}
          >
            <Text variant="h3" style={{ letterSpacing: 2 }}>
              {secret}
            </Text>
          </View>
        ) : null}

        <Input
          label={t('auth.twoFactorCode')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="000000"
        />
        <Button
          title={t('common.confirm')}
          loading={busy}
          disabled={code.length !== 6}
          onPress={verifyTwoFactor}
        />
      </Sheet>

      <Sheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title={t('settings.changePassword')}
      >
        <Input
          label={t('settings.currentPassword')}
          value={current}
          onChangeText={setCurrent}
          error={errors.current ? t(errors.current) : undefined}
          password
        />
        <Input
          label={t('settings.newPassword')}
          value={next}
          onChangeText={setNext}
          error={errors.next ? t(errors.next) : undefined}
          password
        />
        <Button title={t('common.save')} loading={busy} onPress={changePassword} />
      </Sheet>
    </>
  );
}
