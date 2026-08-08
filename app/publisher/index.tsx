import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookPlus, Boxes, LineChart, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { usePublisherStats } from '@/api/hooks';
import { formatCount, formatPrice } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { BarChart } from '@/components/charts/BarChart';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function PublisherDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const user = useCurrentUser();
  const isPublisher = user?.role === 'publisher';
  const { data: stats, isLoading } = usePublisherStats(isPublisher);

  if (!isPublisher) {
    return (
      <>
        <AppHeader back title={t('publisher.title')} />
        <Screen>
          <EmptyState
            icon={<Boxes size={22} color={theme.colors.fgSubtle} />}
            title={t('errors.forbidden')}
            hint={t('errors.forbiddenPublisher')}
            actionLabel={t('settings.title')}
            onAction={() => router.push('/settings')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppHeader back title={t('publisher.title')} subtitle={t('publisher.overview')} />

      <Screen>
        {isLoading || !stats ? (
          <View style={{ gap: theme.spacing.md }}>
            <Skeleton height={110} radius={theme.radius.lg} />
            <Skeleton height={180} radius={theme.radius.lg} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              <MetricCard
                label={t('publisher.totalRevenue')}
                value={formatPrice(stats.revenue, locale)}
                tone="primary"
              />
              <MetricCard label={t('publisher.unitsSold')} value={formatCount(stats.unitsSold)} />
              <MetricCard
                label={t('publisher.pendingOrders')}
                value={String(stats.pendingOrders)}
                tone={stats.pendingOrders > 0 ? 'warning' : 'fg'}
              />
              <MetricCard label={t('publisher.activeBooks')} value={String(stats.activeBooks)} />
            </View>

            <Section title={t('publisher.salesTrend')}>
              <Card level={0}>
                <BarChart
                  data={stats.salesTrend.map((point, i) => ({
                    label: point.month,
                    value: Math.round(point.revenue),
                    highlight: i === stats.salesTrend.length - 1,
                  }))}
                  formatValue={(v) => formatCount(v)}
                />
              </Card>
            </Section>

            <Section title={t('publisher.topBooks')}>
              <Card level={0} style={{ gap: theme.spacing.md }}>
                {stats.topBooks.length === 0 ? (
                  <Text variant="small" color="fgSubtle">
                    {t('publisher.myBooks')}
                  </Text>
                ) : (
                  stats.topBooks.map((entry) => (
                    <View
                      key={entry.book.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
                    >
                      <BookCover title={entry.book.title} uri={entry.book.coverUrl} width={38} />
                      <View style={{ flex: 1 }}>
                        <Text variant="smallStrong" numberOfLines={1}>
                          {entry.book.title}
                        </Text>
                        <Text variant="caption" color="fgSubtle">
                          {entry.units} · {t('publisher.unitsSold')}
                        </Text>
                      </View>
                      <Text variant="smallStrong" color="primary">
                        {formatPrice(entry.revenue, locale)}
                      </Text>
                    </View>
                  ))
                )}
              </Card>
            </Section>

            <ListGroup>
              <ListRow
                title={t('publisher.myBooks')}
                icon={<Boxes size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/publisher/books')}
              />
              <ListRow
                title={t('publisher.orders')}
                icon={<ShoppingBag size={16} color={theme.colors.fgMuted} />}
                value={String(stats.pendingOrders)}
                onPress={() => router.push('/publisher/orders')}
              />
              <ListRow
                title={t('publisher.analytics')}
                icon={<LineChart size={16} color={theme.colors.fgMuted} />}
                onPress={() => router.push('/publisher/analytics')}
              />
            </ListGroup>

            <Button
              title={t('publisher.addBook')}
              icon={<BookPlus size={16} color={theme.colors.primaryFg} />}
              onPress={() => router.push('/publisher/books/new')}
            />
          </>
        )}
      </Screen>
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = 'fg',
}: {
  label: string;
  value: string;
  tone?: 'fg' | 'primary' | 'warning';
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        gap: 4,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text variant="h2" color={tone === 'warning' ? 'warning' : tone}>
        {value}
      </Text>
      <Text variant="caption" color="fgSubtle" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
