import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Award, CalendarDays, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBadges, useShelves, useToggleFollow, useUserActivity } from '@/api/hooks';
import { formatCount, formatDate } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { BarChart } from '@/components/charts/BarChart';
import { GoalRing } from '@/components/charts/GoalRing';
import { PieChart } from '@/components/charts/PieChart';
import { ActivityRow } from './ActivityRow';
import { StatTile } from './StatCards';
import type { User } from '@/types';

export interface ProfileViewProps {
  user: User;
  /** Own profile gets the goal ring, shelves and badge grid; others do not. */
  isMe: boolean;
}

const WEEKDAY_KEYS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];

/** Shared profile body, used by the Profile tab and by `/user/[username]`. */
export function ProfileView({ user, isMe }: ProfileViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data: shelves } = useShelves();
  const { data: badges } = useBadges();
  const { data: activity } = useUserActivity(user.username);
  const toggleFollow = useToggleFollow();

  const earned = badges?.filter((b) => b.earned) ?? [];
  const pieData = user.stats.genreDistribution.slice(0, 6).map((entry) => ({
    label: t(`genres.${entry.genre}`),
    value: entry.count,
  }));

  const weekly = user.stats.weeklyPages.map((value, i) => ({
    label: WEEKDAY_KEYS[i] ?? String(i + 1),
    value,
    highlight: i === user.stats.weeklyPages.length - 1,
  }));

  return (
    <View style={{ gap: theme.spacing['2xl'] }}>
      {/* identity */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
        <Avatar
          name={user.name}
          uri={user.avatarUrl}
          size={72}
          ring={user.stats.readToday}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="h1" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="small" color="fgSubtle">
            @{user.username}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={12} color={theme.colors.fgSubtle} />
            <Text variant="caption" color="fgSubtle">
              {t('profile.joined', { date: formatDate(user.createdAt, locale) })}
            </Text>
          </View>
        </View>
      </View>

      {user.bio ? (
        <Text variant="body" color="fgMuted">
          {user.bio}
        </Text>
      ) : null}

      {!isMe ? (
        <Button
          title={user.isFollowing ? t('profile.unfollow') : t('profile.follow')}
          variant={user.isFollowing ? 'outline' : 'primary'}
          loading={toggleFollow.isPending}
          onPress={() => toggleFollow.mutate({ userId: user.id, follow: !user.isFollowing })}
        />
      ) : null}

      {/* headline numbers */}
      <Card level={0} padded={false}>
        <View style={{ flexDirection: 'row', paddingVertical: theme.spacing.sm }}>
          <StatTile value={user.stats.booksRead} label={t('profile.booksRead')} />
          <Divider />
          <StatTile value={formatCount(user.stats.pagesRead)} label={t('profile.pagesRead')} />
          <Divider />
          <StatTile
            value={formatCount(user.followersCount)}
            label={t('profile.followers')}
            onPress={() => router.push(`/user/${user.username}/followers`)}
          />
          <Divider />
          <StatTile value={formatCount(user.followingCount)} label={t('profile.following')} />
        </View>
      </Card>

      {/* yearly goal */}
      <Section title={t('profile.yearlyGoal')}>
        <Card level={0} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl }}>
          <GoalRing
            value={user.goal.completed}
            target={user.goal.target}
            size={116}
            caption={String(user.goal.year)}
          />
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <Text variant="body" color="fgMuted">
              {user.goal.completed >= user.goal.target
                ? t('profile.goalReached')
                : t('profile.goalRemaining', {
                    count: user.goal.target - user.goal.completed,
                  })}
            </Text>
            {isMe ? (
              <Button
                title={t('settings.title')}
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/settings')}
              />
            ) : null}
          </View>
        </Card>
      </Section>

      {/* genre distribution — the spec's pie chart */}
      {pieData.length > 0 ? (
        <Section title={t('profile.genreDistribution')}>
          <Card level={0}>
            <PieChart
              data={pieData}
              size={150}
              centerLabel={String(user.stats.booksRead)}
              centerSublabel={t('profile.booksRead')}
            />
          </Card>
        </Section>
      ) : null}

      <Section title={t('profile.weeklyActivity')}>
        <Card level={0}>
          <BarChart data={weekly} />
        </Card>
      </Section>

      {isMe ? (
        <Section
          title={t('profile.badges')}
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/badges')}>
              <ChevronRight size={18} color={theme.colors.fgSubtle} />
            </Pressable>
          }
        >
          <Card level={0}>
            {earned.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Award size={20} color={theme.colors.fgSubtle} />
                <Text variant="small" color="fgMuted" style={{ flex: 1 }}>
                  {t('game.locked')}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                {earned.slice(0, 8).map((badge) => (
                  <View key={badge.id} style={{ width: 64, alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.primarySoft,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{badge.icon}</Text>
                    </View>
                    <Text variant="caption" color="fgSubtle" center numberOfLines={2}>
                      {badge.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Section>
      ) : null}

      {isMe && shelves ? (
        <Section title={t('profile.shelves')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {shelves.map((shelf) => (
              <Pressable
                key={shelf.id}
                accessibilityRole="button"
                onPress={() => router.push(`/shelf/${shelf.id}`)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text variant="small">
                  {shelf.status
                    ? t(`shelf.${shelf.status === 'want_to_read' ? 'wantToRead' : shelf.status}`)
                    : shelf.name}{' '}
                  <Text variant="small" color="fgSubtle">
                    {shelf.booksCount}
                  </Text>
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={t('profile.activity')}>
        {!activity || activity.length === 0 ? (
          <Text variant="small" color="fgSubtle">
            {t('profile.noActivity')}
          </Text>
        ) : (
          <View style={{ gap: theme.spacing.xs }}>
            {activity.slice(0, 10).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </View>
        )}
      </Section>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ width: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />;
}
