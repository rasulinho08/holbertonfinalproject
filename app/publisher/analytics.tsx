import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { usePublisherStats } from '@/api/hooks';
import { formatCount, formatPrice } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { Card } from '@/components/ui/Card';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function PublisherAnalyticsScreen() {
  const { t } = useI18n();

  return (
    <>
      <AppHeader back title={t('publisher.analytics')} />
      <RoleGate role="publisher">
        <PublisherAnalytics />
      </RoleGate>
    </>
  );
}

function PublisherAnalytics() {
  const theme = useTheme();
  const { t, locale } = useI18n();

  const user = useCurrentUser();
  const { data: stats, isLoading } = usePublisherStats(user?.role === 'publisher');

  return (
    <>
      <Screen>
        {isLoading || !stats ? (
          <View style={{ gap: theme.spacing.md }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={180} radius={theme.radius.lg} />
            ))}
          </View>
        ) : (
          <>
            <Section title={t('publisher.salesTrend')}>
              <Card level={0} style={{ gap: theme.spacing.md }}>
                <Text variant="display" color="primary">
                  {formatPrice(stats.revenue, locale)}
                </Text>
                <BarChart
                  data={stats.salesTrend.map((point, i) => ({
                    label: point.month,
                    value: Math.round(point.revenue),
                    highlight: i === stats.salesTrend.length - 1,
                  }))}
                  height={150}
                  formatValue={(v) => formatCount(v)}
                />
              </Card>
            </Section>

            <Section title={t('publisher.revenueByGenre')}>
              <Card level={0}>
                <PieChart
                  data={stats.revenueByGenre.map((entry) => ({
                    label: t(`genres.${entry.genre}`),
                    value: Math.round(entry.revenue),
                  }))}
                  size={150}
                  centerLabel={formatCount(stats.unitsSold)}
                  centerSublabel={t('publisher.unitsSold')}
                />
              </Card>
            </Section>

            <Section title={t('publisher.topBooks')}>
              <Card level={0} style={{ gap: theme.spacing.md }}>
                {stats.topBooks.map((entry, index) => {
                  const max = Math.max(1, ...stats.topBooks.map((b) => b.units));
                  return (
                    <View key={entry.book.id} style={{ gap: 5 }}>
                      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                        <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
                          {index + 1}. {entry.book.title}
                        </Text>
                        <Text variant="smallStrong">{entry.units}</Text>
                      </View>
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.colors.subtle,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${(entry.units / max) * 100}%`,
                            height: '100%',
                            borderRadius: 3,
                            backgroundColor: theme.colors.chart[index % theme.colors.chart.length],
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}
