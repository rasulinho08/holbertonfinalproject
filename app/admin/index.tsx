import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  FileText,
  Flag,
  MessageSquare,
  Quote as QuoteIcon,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useAdminStats } from '@/api/hooks';
import { formatCount, formatPrice } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { FadeIn, useCountUp } from '@/components/ui/Motion';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

/**
 * Moderation dashboard.
 *
 * Four groups, in the order a moderator actually cares about them: is anything
 * waiting for me, are people using the app, what is in the catalogue, and is
 * the shop working. The queues are last because they are a destination, not a
 * status.
 */
export default function AdminDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const { data: stats, isLoading } = useAdminStats(isAdmin);

  if (!isAdmin) {
    return (
      <>
        <AppHeader back title={t('admin.title')} />
        <Screen>
          <EmptyState
            icon={<ShieldCheck size={22} color={theme.colors.fgSubtle} />}
            title={t('errors.forbidden')}
            hint={t('errors.forbiddenAdmin')}
            actionLabel={t('settings.title')}
            onAction={() => router.push('/settings')}
          />
        </Screen>
      </>
    );
  }

  if (isLoading || !stats) {
    return (
      <>
        <AppHeader back title={t('admin.title')} subtitle={t('admin.overview')} />
        <Screen>
          <Skeleton height={96} radius={theme.radius.lg} />
          <Skeleton height={180} radius={theme.radius.lg} />
          <Skeleton height={180} radius={theme.radius.lg} />
        </Screen>
      </>
    );
  }

  const { users, content, commerce, moderation } = stats;

  return (
    <>
      <AppHeader back title={t('admin.title')} subtitle={t('admin.overview')} />

      <Screen contentStyle={{ gap: theme.spacing['2xl'] }}>
        {/* Anything needing attention goes first, and only when there is any. */}
        {moderation.openReports > 0 ? (
          <FadeIn>
            <Pressable accessibilityRole="button" onPress={() => router.push('/admin/reports')}>
              <Card
                level={0}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  backgroundColor: theme.colors.warningSoft,
                  borderColor: 'transparent',
                }}
              >
                <Flag size={20} color={theme.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" style={{ color: theme.colors.warningSoftFg }}>
                    {t('admin.openReports')}: {moderation.openReports}
                  </Text>
                  <Text variant="small" style={{ color: theme.colors.warningSoftFg, opacity: 0.8 }}>
                    {t('admin.reviewQueue')}
                  </Text>
                </View>
              </Card>
            </Pressable>
          </FadeIn>
        ) : null}

        {/* ------------------------------ people ------------------------------ */}

        <Section title={t('admin.users')}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric label={t('admin.totalUsers')} value={users.total} icon={Users} tone="primary" />
              <Metric label={t('admin.activeToday')} value={users.activeToday} icon={TrendingUp} tone="success" />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric label={t('admin.activeWeek')} value={users.activeThisWeek} />
              <Metric label={t('admin.newThisWeek')} value={users.newThisWeek} />
            </View>

            <Card level={0} style={{ gap: theme.spacing.md }}>
              <Text variant="smallStrong">{t('admin.signupTrend')}</Text>
              <BarChart
                data={stats.signupTrend.map((p, i) => ({
                  label: p.label,
                  value: p.value,
                  highlight: i === stats.signupTrend.length - 1,
                }))}
                height={110}
              />
            </Card>

            {/* Role split, so it is obvious at a glance how many staff accounts
                exist — a publisher or admin account nobody remembers creating
                is worth noticing. */}
            <Text variant="caption" color="fgSubtle">
              {t('admin.activeHint')}
            </Text>

            <Card level={0} style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
              <RoleCount label={t('admin.readers')} value={users.readers} color={theme.colors.chart[0]} />
              <RoleCount label={t('nav.publisher')} value={users.publishers} color={theme.colors.chart[1]} />
              <RoleCount label={t('nav.admin')} value={users.admins} color={theme.colors.chart[2]} />
            </Card>
          </View>
        </Section>

        {/* ----------------------------- activity ----------------------------- */}

        <Section title={t('admin.activity')}>
          <Card level={0} style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="smallStrong">{t('admin.sessionsPerDay')}</Text>
              <Text variant="small" color="fgMuted">
                {formatCount(content.pagesRead)} {t('profile.pagesRead')}
              </Text>
            </View>
            <BarChart
              data={stats.activityTrend.map((p, i) => ({
                label: p.label,
                value: p.value,
                highlight: i === stats.activityTrend.length - 1,
              }))}
              height={110}
              color={theme.colors.accent}
            />
          </Card>
        </Section>

        {/* ----------------------------- catalogue ---------------------------- */}

        <Section title={t('admin.catalogue')}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric label={t('admin.books')} value={content.books} icon={BookOpen} />
              <Metric label={t('admin.authorsCount')} value={content.authors} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric label={t('admin.reviews')} value={content.reviews} icon={MessageSquare} />
              <Metric label={t('admin.quotes')} value={content.quotes} icon={QuoteIcon} />
            </View>

            {stats.genreSpread.length > 0 ? (
              <Card level={0} style={{ gap: theme.spacing.md }}>
                <Text variant="smallStrong">{t('profile.genreDistribution')}</Text>
                <PieChart
                  data={stats.genreSpread.map((g) => ({
                    label: t(`genres.${g.genre}`),
                    value: g.count,
                  }))}
                  innerRatio={0.6}
                  centerLabel={formatCount(content.books)}
                  centerSublabel={t('admin.books')}
                />
              </Card>
            ) : null}
          </View>
        </Section>

        {/* ---------------------------- most read ----------------------------- */}

        {stats.topBooks.length > 0 ? (
          <Section title={t('admin.mostRead')}>
            <Card level={0} style={{ gap: theme.spacing.lg }}>
              {stats.topBooks.map((book, index) => (
                <Pressable
                  key={book.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/book/${book.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
                >
                  <Text variant="caption" color="fgSubtle" style={{ width: 16 }}>
                    {index + 1}
                  </Text>
                  <BookCover title={book.title} uri={book.coverUrl} width={34} />
                  <View style={{ flex: 1 }}>
                    <Text variant="smallStrong" numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                      {book.authorName}
                    </Text>
                  </View>
                  <Text variant="smallStrong" color="primary">
                    {book.readers}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}

        {stats.topReaders.length > 0 ? (
          <Section title={t('admin.topReaders')}>
            <Card level={0} style={{ gap: theme.spacing.lg }}>
              {stats.topReaders.map((row, index) => (
                <Pressable
                  key={row.user.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/user/${row.user.username}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
                >
                  <Text variant="caption" color="fgSubtle" style={{ width: 16 }}>
                    {index + 1}
                  </Text>
                  <Avatar name={row.user.name} uri={row.user.avatarUrl} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text variant="smallStrong" numberOfLines={1}>
                      {row.user.name}
                    </Text>
                    <Text variant="caption" color="fgSubtle">
                      {formatCount(row.pagesRead)} {t('profile.pagesRead')}
                    </Text>
                  </View>
                  <Text variant="smallStrong" color="primary">
                    {row.booksRead}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}

        {/* ------------------------------ commerce ---------------------------- */}

        <Section title={t('admin.commerce')}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric
                label={t('publisher.totalRevenue')}
                value={commerce.revenue}
                money
                icon={ShoppingBag}
                tone="success"
              />
              <Metric label={t('order.title')} value={commerce.orders} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Metric label={t('publisher.pendingOrders')} value={commerce.pending} tone="warning" />
              <Metric label={t('admin.averageOrder')} value={commerce.averageOrder} money />
            </View>
          </View>
        </Section>

        {/* ------------------------------- queues ----------------------------- */}

        <Section title={t('admin.moderation')}>
          <ListGroup>
            <ListRow
              title={t('admin.users')}
              value={String(users.total)}
              icon={<Users size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/users')}
            />
            <ListRow
              title={t('admin.reports')}
              value={String(moderation.openReports)}
              icon={<Flag size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/reports')}
            />
            <ListRow
              title={t('admin.reviews')}
              value={String(content.reviews)}
              icon={<MessageSquare size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/reviews')}
            />
            <ListRow
              title={t('admin.quotes')}
              value={String(content.quotes)}
              icon={<QuoteIcon size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/quotes')}
            />
            <ListRow
              title={t('admin.posts')}
              icon={<FileText size={16} color={theme.colors.fgMuted} />}
              onPress={() => router.push('/admin/posts' as never)}
            />
          </ListGroup>

          <Text variant="caption" color="fgSubtle">
            {t('admin.resolvedHint', {
              resolved: moderation.resolvedReports,
              removed: moderation.removedContent,
            })}
          </Text>
        </Section>
      </Screen>
    </>
  );
}

/* -------------------------------- metric ---------------------------------- */

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

function Metric({
  label,
  value,
  icon: Icon,
  tone = 'default',
  money: isMoney,
}: {
  label: string;
  value: number;
  icon?: typeof Users;
  tone?: Tone;
  money?: boolean;
}) {
  const theme = useTheme();
  const { locale } = useI18n();
  const counted = useCountUp(value);

  const accent =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'success'
        ? theme.colors.success
        : tone === 'warning'
          ? theme.colors.warning
          : tone === 'danger'
            ? theme.colors.danger
            : theme.colors.fgMuted;

  return (
    <Card level={0} style={{ flex: 1, gap: theme.spacing.xs, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Icon ? <Icon size={14} color={accent} /> : null}
        <Text variant="caption" color="fgSubtle" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </View>

      {/* Money is formatted, not counted up — a ticking price reads as a bug. */}
      <Text variant="h2" style={{ color: accent }}>
        {isMoney ? formatPrice(value, locale) : counted}
      </Text>
    </Card>
  );
}

function RoleCount({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text variant="caption" color="fgSubtle" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="bodyStrong" style={{ marginLeft: theme.spacing.md }}>
        {value}
      </Text>
    </View>
  );
}
