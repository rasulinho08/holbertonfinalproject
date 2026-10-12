import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth, useCurrentUser } from '@/store/auth';
import * as validate from '@/lib/validation';
import { serverMessage } from '@/api/errors';
import { isLocalUri, uploadImage } from '@/lib/uploads';
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
  // Either the saved http(s) URL or, after picking, a local URI that is
  // uploaded on save. Width is kept so small pictures are not upscaled.
  const [avatar, setAvatar] = useState<{ uri: string | null; width?: number }>({
    uri: user?.avatarUrl ?? null,
  });
  const [cover, setCover] = useState<{ uri: string | null; width?: number }>({
    uri: user?.coverPhotoUrl ?? null,
  });
  const [goal, setGoalValue] = useState(String(user?.goal.target ?? 24));
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});
  const [busy, setBusy] = useState(false);

  const pick = async (aspect: [number, number]) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    return asset ? { uri: asset.uri, width: asset.width } : null;
  };

  const pickAvatar = async () => {
    const picked = await pick([1, 1]);
    if (picked) setAvatar(picked);
  };

  const pickCover = async () => {
    const picked = await pick([3, 1]);
    if (picked) setCover(picked);
  };

  /** Uploads a freshly picked photo; saved URLs and removals pass through. */
  const persist = async (photo: { uri: string | null; width?: number }, kind: 'avatar' | 'cover') =>
    isLocalUri(photo.uri) ? uploadImage(photo.uri, kind, photo.width) : photo.uri;

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
    let avatarUrl: string | null;
    let coverPhotoUrl: string | null;
    try {
      [avatarUrl, coverPhotoUrl] = await Promise.all([persist(avatar, 'avatar'), persist(cover, 'cover')]);
    } catch (error) {
      toast.error(serverMessage(error) ?? t('profile.uploadFailed'));
      setBusy(false);
      return;
    }
    try {
      await updateProfile({
        name: name.trim(),
        username: username.trim(),
        bio,
        avatarUrl,
        coverPhotoUrl,
        website: websiteValue || null,
      });
      const target = Number(goal);
      if (Number.isFinite(target) && target > 0 && target !== user?.goal.target) {
        await setGoal(target);
      }
      toast.success(t('common.save'));
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
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
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.md, alignItems: 'center' }}>
            {/* Siblings, not nested: a button inside a button is invalid on the web. */}
            <View style={{ width: '100%' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.coverPhoto')}
                onPress={pickCover}
                style={{
                  height: 120,
                  width: '100%',
                  borderRadius: theme.radius.xl,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.subtle,
                  borderWidth: cover.uri ? 0 : 1,
                  borderStyle: 'dashed',
                  borderColor: theme.colors.borderStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cover.uri ? (
                  <Image
                    source={{ uri: cover.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                    <ImagePlus size={22} color={theme.colors.fgMuted} />
                    <Text variant="small" color="fgMuted">
                      {t('profile.coverPhoto')}
                    </Text>
                  </View>
                )}
              </Pressable>
                {cover.uri ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.removeCoverPhoto')}
                    hitSlop={8}
                    onPress={() => setCover({ uri: null })}
                    style={{
                      position: 'absolute',
                      top: theme.spacing.sm,
                      right: theme.spacing.sm,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.55)',
                    }}
                  >
                    <X size={16} color="#FFFFFF" />
                  </Pressable>
                ) : null}
            </View>

            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <Avatar name={name || '?'} uri={avatar.uri} size={92} />
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  title={t('profile.avatar')}
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  icon={<Camera size={15} color={theme.colors.fg} />}
                  onPress={pickAvatar}
                />
              </View>
            </View>
          </View>
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