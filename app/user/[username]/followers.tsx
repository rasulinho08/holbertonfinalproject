import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useFollowers, useFollowing, useToggleFollow } from '@/api/hooks';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function FollowersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [tab, setTab] = useState<'followers' | 'following'>('followers');
  const followers = useFollowers(username);
  const following = useFollowing(username);
  const toggleFollow = useToggleFollow();

  const active = tab === 'followers' ? followers : following;

  return (
    <>
      <AppHeader back title={`@${username}`} />

      <FlatList
        data={active.data}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <SegmentedControl
            value={tab}
            onChange={setTab}
            style={{ marginBottom: theme.spacing.md }}
            options={[
              { value: 'followers', label: t('profile.followers') },
              { value: 'following', label: t('profile.following') },
            ]}
          />
        }
        renderItem={({ item }) => (
          // Only the avatar-and-name region opens the profile; the follow
          // button is a sibling. Nesting it inside the row's Pressable put a
          // <button> inside a <button>, so following someone also navigated.
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => router.push(`/user/${item.username}`)}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Avatar name={item.name} uri={item.avatarUrl} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="small" color="fgSubtle">
                  @{item.username}
                </Text>
              </View>
            </Pressable>
            <Button
              title={item.isFollowing ? t('profile.unfollow') : t('profile.follow')}
              variant={item.isFollowing ? 'outline' : 'secondary'}
              size="sm"
              fullWidth={false}
              onPress={() =>
                toggleFollow.mutate({ userId: item.id, follow: !item.isFollowing })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          active.isLoading ? (
            <View style={{ gap: theme.spacing.sm }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={62} radius={theme.radius.md} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Users size={22} color={theme.colors.fgSubtle} />}
              title={t('profile.emptyFollowers')}
            />
          )
        }
      />
    </>
  );
}
