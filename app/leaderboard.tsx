import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useLeaderboard } from '@/api/hooks';
import { formatCount } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import type { LeaderboardMetric, LeaderboardPeriod } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [metric, setMetric] = useState<LeaderboardMetric>('books');

  const { data: entries, isLoading } = useLeaderboard(period, metric);
  const myEntry = entries?.find((e) => e.isMe);

  return (
    <>
      <AppHeader back title={t('game.leaderboard')} />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.user.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.xs,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <SegmentedControl
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'weekly', label: t('game.weekly') },
                { value: 'monthly', label: t('game.monthly') },
                { value: 'all_time', label: t('game.allTime') },
              ]}
            />
            <SegmentedControl
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'books', label: t('game.byBooks') },
                { value: 'pages', label: t('game.byPages') },
              ]}
            />

            {/* The viewer's own standing, pinned above the list. */}
            {myEntry ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.primarySoft,
                }}
              >
                <Text variant="h3" color="primary" style={{ width: 32, textAlign: 'center' }}>
                  {myEntry.rank}
                </Text>
                <Avatar name={myEntry.user.name} uri={myEntry.user.avatarUrl} size={38} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {t('game.you')}
                </Text>
                <Text variant="bodyStrong" color="primary">
                  {metric === 'books' ? myEntry.books : formatCount(myEntry.pages)}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.rank}. ${item.user.name}`}
            onPress={() => router.push(`/user/${item.user.username}`)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: item.isMe
                ? theme.colors.primarySoft
                : pressed
                  ? theme.colors.subtle
                  : 'transparent',
            })}
          >
            <View style={{ width: 32, alignItems: 'center' }}>
              {item.rank <= 3 ? (
                <Text style={{ fontSize: 20 }}>{MEDALS[item.rank - 1]}</Text>
              ) : (
                <Text variant="smallStrong" color="fgSubtle">
                  {item.rank}
                </Text>
              )}
            </View>

            <Avatar name={item.user.name} uri={item.user.avatarUrl} size={38} />

            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.isMe ? t('game.you') : item.user.name}
              </Text>
              <Text variant="caption" color="fgSubtle">
                @{item.user.username}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodyStrong" color={item.rank <= 3 ? 'primary' : 'fg'}>
                {metric === 'books' ? item.books : formatCount(item.pages)}
              </Text>
              <Text variant="caption" color="fgSubtle">
                {metric === 'books' ? t('profile.booksRead') : t('profile.pagesRead')}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.sm }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={62} radius={theme.radius.md} />
              ))}
            </View>
          ) : (
            <EmptyState icon={<Trophy size={22} color={theme.colors.fgSubtle} />} title={t('game.leaderboard')} />
          )
        }
      />
    </>
  );
}
