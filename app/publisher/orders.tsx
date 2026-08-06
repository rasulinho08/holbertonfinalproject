import React from 'react';
import { FlatList, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { usePublisherOrders, useUpdateOrderStatus } from '@/api/hooks';
import { formatDate, formatPrice } from '@/lib/format';
import { ORDER_TIMELINE, orderStatusLabelKey, orderStatusTone } from '@/components/commerce/orderStatus';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { OrderStatus } from '@/types';

/** Publisher-side order queue: advance an order to the next fulfilment step. */
export default function PublisherOrdersScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const isPublisher = user?.role === 'publisher';
  const { data: orders, isLoading } = usePublisherOrders(isPublisher);
  const updateStatus = useUpdateOrderStatus();

  const nextStatus = (status: OrderStatus): OrderStatus | null => {
    const index = ORDER_TIMELINE.indexOf(status);
    if (index < 0 || index === ORDER_TIMELINE.length - 1) return null;
    return ORDER_TIMELINE[index + 1];
  };

  return (
    <>
      <AppHeader back title={t('publisher.orders')} />

      <FlatList
        data={orders}
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
        renderItem={({ item }) => {
          const next = nextStatus(item.status);
          return (
            <Card level={0} style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{t('order.orderNumber', { code: item.code })}</Text>
                  <Text variant="caption" color="fgSubtle">
                    {t('order.placedOn', { date: formatDate(item.createdAt, locale) })}
                  </Text>
                </View>
                <Badge
                  label={t(orderStatusLabelKey(item.status))}
                  tone={orderStatusTone(item.status)}
                />
              </View>

              <View style={{ gap: 4 }}>
                {item.items.map((line) => (
                  <Text key={line.bookId} variant="small" color="fgMuted" numberOfLines={1}>
                    {line.quantity} × {line.title}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="fgSubtle">
                    {item.address.city} · {item.address.fullName}
                  </Text>
                  <Text variant="bodyStrong" color="primary">
                    {formatPrice(item.total, locale)}
                  </Text>
                </View>

                {next ? (
                  <Button
                    title={t(orderStatusLabelKey(next))}
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    loading={updateStatus.isPending}
                    onPress={async () => {
                      await updateStatus.mutateAsync({ id: item.id, status: next });
                      toast.success(t(orderStatusLabelKey(next)));
                    }}
                  />
                ) : null}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={140} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<ShoppingBag size={22} color={theme.colors.fgSubtle} />}
              title={t('order.empty')}
              hint={t('publisher.orders')}
            />
          )
        }
      />
    </>
  );
}
