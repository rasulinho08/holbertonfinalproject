import React from 'react';
import { View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBadges, useCheckInStreak, useStreak } from '@/api/hooks';
import { formatDate } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Badge as BadgeModel } from '@/types';

export default function BadgesScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const toast = useToast();

  const { data: badges, isLoading } = useBadges();
  const { data: streak } = useStreak();
  const checkIn = useCheckInStreak();

  const earned = badges?.filter((b) => b.earned) ?? [];
  const locked = badges?.filter((b) => !b.earned) ?? [];

  return (
    <>
      <AppHeader back title={t('game.badges')} />

      <Screen>
        {/* streak */}
        <Card level={0} style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.warningSoft,
              }}
            >
              <Flame
                size={26}
                color={theme.colors.streak}
                fill={streak?.readToday ? theme.colors.streak : 'transparent'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="display">{streak?.current ?? 0}</Text>
              <Text variant="small" color="fgMuted">
                {t('game.streakSubtitle')}
              </Text>
              <Text variant="caption" color="fgSubtle">
                {t('game.longestStreak', { count: streak?.longest ?? 0 })}
              </Text>
            </View>
          </View>

          {!streak?.readToday ? (
            <Button
              title={t('game.streakPending')}
              variant="secondary"
              loading={checkIn.isPending}
              onPress={async () => {
                await checkIn.mutateAsync();
                toast.success(t('game.streakToday'));
              }}
            />
          ) : null}
        </Card>

        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={90} radius={theme.radius.lg} />
            ))}
          </View>
        ) : (
          <>
            <Section title={`${t('game.earned')} (${earned.length})`}>
              {earned.length === 0 ? (
                <Text variant="small" color="fgSubtle">
                  {t('game.locked')}
                </Text>
              ) : (
                <View style={{ gap: theme.spacing.md }}>
                  {earned.map((badge) => (
                    <BadgeRow key={badge.id} badge={badge} locale={locale} />
                  ))}
                </View>
              )}
            </Section>

            <Section title={`${t('game.locked')} (${locked.length})`}>
              <View style={{ gap: theme.spacing.md }}>
                {locked.map((badge) => (
                  <BadgeRow key={badge.id} badge={badge} locale={locale} />
                ))}
              </View>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}

function BadgeRow({ badge, locale }: { badge: BadgeModel; locale: 'az' | 'en' }) {
  const theme = useTheme();
  const { t } = useI18n();
  const percent = badge.target > 0 ? (badge.progress / badge.target) * 100 : 0;

  return (
    <Card
      level={0}
      style={{ flexDirection: 'row', gap: theme.spacing.md, opacity: badge.earned ? 1 : 0.75 }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: badge.earned ? theme.colors.primarySoft : theme.colors.subtle,
        }}
      >
        <Text style={{ fontSize: 24, opacity: badge.earned ? 1 : 0.4 }}>{badge.icon}</Text>
      </View>

      <View style={{ flex: 1, gap: 5, justifyContent: 'center' }}>
        <Text variant="bodyStrong">{badge.name}</Text>
        <Text variant="small" color="fgMuted">
          {badge.description}
        </Text>

        {badge.earned ? (
          badge.earnedAt ? (
            <Text variant="caption" color="success">
              {t('game.earnedOn', { date: formatDate(badge.earnedAt, locale) })}
            </Text>
          ) : null
        ) : (
          <>
            <Progress value={percent} height={5} />
            <Text variant="caption" color="fgSubtle">
              {t('game.progressTo', { current: badge.progress, target: badge.target })}
            </Text>
          </>
        )}
      </View>
    </Card>
  );
}
