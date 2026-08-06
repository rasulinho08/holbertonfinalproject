import React from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useOrders } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { formatDate, formatPrice } from '@/lib/format';
import { orderStatusTone, orderStatusLabelKey } from '@/components/commerce/orderStatus';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function OrdersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data: orders, isLoading, refetch } = useOrders();
  const { refreshing, onRefresh } = useRefresh(refetch);

  return (
    <>
      <AppHeader back title={t('order.title')} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing['4xl'],
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        renderItem={({ item }) => (
          <Card level={0} onPress={() => router.push(`/orders/${item.id}`)} style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('order.orderNumber', { code: item.code })}</Text>
                <Text variant="caption" color="fgSubtle">
                  {t('order.placedOn', { date: formatDate(item.createdAt, locale) })}
                </Text>
              </View>
              <Badge label={t(orderStatusLabelKey(item.status))} tone={orderStatusTone(item.status)} />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {item.items.slice(0, 4).map((line) => (
                <BookCover key={line.bookId} title={line.title} uri={line.coverUrl} width={38} />
              ))}
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Text variant="small" color="fgMuted" numberOfLines={1}>
                  {item.publisherName}
                </Text>
                <Text variant="bodyStrong" color="primary">
                  {formatPrice(item.total, locale)}
                </Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={130} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Package size={22} color={theme.colors.fgSubtle} />}
              title={t('order.empty')}
              hint={t('order.emptyHint')}
              actionLabel={t('nav.explore')}
              onAction={() => router.push('/explore')}
            />
          )
        }
      />
    </>
  );
}
