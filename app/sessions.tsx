import React from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Timer, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useDeleteReadingSession, useReadingSessions, useReadingStats } from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { BarChart } from '@/components/charts/BarChart';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { FadeIn } from '@/components/ui/Motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { StatTile } from '@/components/profile/StatCards';

const WEEKDAY_KEYS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];

/** Full reading history, with the aggregates the profile card only previews. */
export default function SessionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();

  const { data: sessions, isLoading } = useReadingSessions();
  const { data: stats } = useReadingStats(30);
  const remove = useDeleteReadingSession();

  return (
    <>
      <AppHeader back title={t('session.statsTitle')} />

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          stats && stats.sessionCount > 0 ? (
            <Card level={0} style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row' }}>
                <StatTile
                  value={t('session.minutes', { count: stats.totalMinutes })}
                  label={t('session.totalMinutes')}
                />
                <StatTile value={stats.totalPages} label={t('session.totalPages')} />
                <StatTile
                  value={stats.pagesPerHour}
                  label={t('session.pagesPerHour')}
                  tone="primary"
                />
              </View>

              <View>
                <Text variant="caption" color="fgSubtle" style={{ marginBottom: theme.spacing.sm }}>
                  {t('session.dailyMinutes')}
                </Text>
                <BarChart
                  data={stats.dailyMinutes.map((value, i) => ({
                    label: WEEKDAY_KEYS[i],
                    value,
                    highlight: i === stats.dailyMinutes.length - 1,
                  }))}
                  height={120}
                />
              </View>
            </Card>
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index % 12}>
            <Card
              level={0}
              style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}
            >
              <BookCover
                title={item.book?.title ?? ''}
                uri={item.book?.coverUrl}
                width={40}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="smallStrong" numberOfLines={1}>
                  {item.book?.title}
                </Text>
                <Text variant="caption" color="fgSubtle">
                  {t('session.pagesRange', { from: item.startPage, to: item.endPage })} ·{' '}
                  {t('session.minutes', { count: Math.round(item.durationSeconds / 60) })}
                </Text>
                <Text variant="caption" color="fgSubtle">
                  {formatRelative(item.startedAt, locale)}
                </Text>
                {item.note ? (
                  <Text variant="small" color="fgMuted" numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}
              </View>

              <Text variant="bodyStrong" color="primary">
                +{Math.max(0, item.endPage - item.startPage)}
              </Text>

              <IconButton
                label={t('common.delete')}
                onPress={async () => {
                  await remove.mutateAsync(item.id);
                  toast.success(t('common.delete'));
                }}
              >
                <Trash2 size={15} color={theme.colors.fgSubtle} />
              </IconButton>
            </Card>
          </FadeIn>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={84} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Timer size={22} color={theme.colors.fgSubtle} />}
              title={t('session.empty')}
              hint={t('session.emptyHint')}
              actionLabel={t('nav.shelves')}
              onAction={() => router.push('/shelves')}
            />
          )
        }
      />
    </>
  );
}
