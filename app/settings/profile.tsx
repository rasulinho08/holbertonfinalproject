import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth, useCurrentUser } from '@/store/auth';
import * as validate from '@/lib/validation';
import { serverMessage } from '@/api/errors';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

const BIO_LIMIT = 240;

/** Folds free text into an absolute URL: "github.com/e" → "https://github.com/e". */
function normalizeWebsite(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

export default function ProfileSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const updateProfile = useAuth((s) => s.updateProfile);
  const setGoal = useAuth((s) => s.setGoal);

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [goal, setGoalValue] = useState(String(user?.goal.target ?? 24));
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});
  const [busy, setBusy] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) setAvatarUrl(result.assets[0].uri);
  };

  const save = async () => {
    const websiteValue = normalizeWebsite(website);
    const next = {
      name: validate.required(name),
      username: validate.username(username),
      bio: validate.maxLength(bio, BIO_LIMIT),
      website: validate.url(websiteValue),
    };
    setErrors(next);
    if (!validate.isValid(next)) return;

    setBusy(true);
    try {
      await updateProfile({
        name: name.trim(),
        username: username.trim(),
        bio,
        avatarUrl,
        website: websiteValue || null,
      });
      const target = Number(goal);
      if (Number.isFinite(target) && target > 0 && target !== user?.goal.target) {
        await setGoal(target);
      }
      toast.success(t('common.save'));
      router.back();
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader back title={t('settings.editProfile')} />

      <Screen keyboardAware>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Avatar name={name || '?'} uri={avatarUrl} size={92} />
          <Button
            title={t('profile.avatar')}
            variant="outline"
            size="sm"
            fullWidth={false}
            icon={<Camera size={15} color={theme.colors.fg} />}
            onPress={pickAvatar}
          />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Input
            label={t('auth.fullName')}
            value={name}
            onChangeText={setName}
            error={errors.name ? t(errors.name) : undefined}
          />
          <Input
            label={t('auth.username')}
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase())}
            error={errors.username ? t(errors.username) : undefined}
            autoCapitalize="none"
          />
          <Input
            label={t('profile.bio')}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, BIO_LIMIT))}
            error={errors.bio ? t(errors.bio) : undefined}
            multiline
            placeholder={t('profile.bioPlaceholder')}
            hint={`${bio.length}/${BIO_LIMIT}`}
          />
          <Input
            label={t('profile.website')}
            value={website}
            onChangeText={(v) => setWebsite(v.trimStart())}
            error={errors.website ? t(errors.website) : undefined}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            inputMode="url"
            placeholder={t('profile.websitePlaceholder')}
          />
          <Input
            label={t('profile.yearlyGoal')}
            value={goal}
            onChangeText={setGoalValue}
            keyboardType="number-pad"
            inputMode="numeric"
            hint={t('onboarding.booksPerYear')}
          />
        </View>

        <Button title={t('common.save')} loading={busy} onPress={save} />

        <Text variant="caption" color="fgSubtle" center>
          {user?.email}
        </Text>
      </Screen>
    </>
  );
}
