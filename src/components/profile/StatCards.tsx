import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Target } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCountUp } from '@/components/ui/Motion';
import { Progress } from '@/components/ui/Progress';
import { Text } from '@/components/ui/Text';
import type { ReadingGoal } from '@/types';

/** Reading-streak tile. Dimmed when today's reading has not been logged yet. */
export function StreakCard({
  days,
  readToday,
  onPress,
}: {
  days: number;
  readToday: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const shown = useCountUp(days);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('game.streakTitle')}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: theme.spacing.xs,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Flame
          size={20}
          color={readToday ? theme.colors.streak : theme.colors.fgSubtle}
          fill={readToday ? theme.colors.streak : 'transparent'}
        />
        <Text variant="h1">{shown}</Text>
      </View>
      <Text variant="caption" color="fgSubtle" numberOfLines={1}>
        {t('game.streakTitle')}
      </Text>
      <Text variant="caption" color={readToday ? 'success' : 'fgSubtle'} numberOfLines={1}>
        {readToday ? t('game.streakToday') : t('game.streakPending')}
      </Text>
    </Pressable>
  );
}

/** Annual goal tile with a progress bar — the spec's completion percentage. */
export function GoalCard({ goal, onPress }: { goal: ReadingGoal; onPress?: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();

  const percent = goal.target > 0 ? Math.min(100, (goal.completed / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.completed);
  const shown = useCountUp(goal.completed);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('profile.yearlyGoal')}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Target size={20} color={theme.colors.primary} />
        <Text variant="h1">
          {shown}
          <Text variant="small" color="fgSubtle">
            /{goal.target}
          </Text>
        </Text>
      </View>
      <Text variant="caption" color="fgSubtle" numberOfLines={1}>
        {t('profile.yearlyGoal')}
      </Text>
      <Progress value={percent} height={5} />
      <Text variant="caption" color={remaining === 0 ? 'success' : 'fgMuted'} numberOfLines={1}>
        {remaining === 0 ? t('profile.goalReached') : t('profile.goalRemaining', { count: remaining })}
      </Text>
    </Pressable>
  );
}

/** Small labelled number used across profile and dashboards. */
export function StatTile({
  value,
  label,
  onPress,
  tone = 'fg',
}: {
  value: string | number;
  label: string;
  onPress?: () => void;
  tone?: 'fg' | 'primary' | 'success';
}) {
  const theme = useTheme();
  const router = useRouter();

  const body = (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: theme.spacing.sm }}>
      <Text variant="h2" color={tone}>
        {value}
      </Text>
      <Text variant="caption" color="fgSubtle" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}
