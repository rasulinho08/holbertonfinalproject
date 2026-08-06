import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, MapPin, Receipt as ReceiptIcon, XCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCancelOrder, useOrder, useReceipt } from '@/api/hooks';
import { formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_TIMELINE, orderStatusLabelKey, orderStatusTone } from '@/components/commerce/orderStatus';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen, Section } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function OrderDetailScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading } = useOrder(id);
  const { data: receipt } = useReceipt(id);
  const cancel = useCancelOrder();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading || !order) {
    return (
      <>
        <AppHeader back />
        <Screen>
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={220} radius={theme.radius.lg} />
        </Screen>
      </>
    );
  }

  const reached = new Set(order.timeline.map((event) => event.status));
  const cancelled = order.status === 'cancelled';
  const canCancel = ['pending', 'confirmed', 'preparing'].includes(order.status);

  return (
    <>
      <AppHeader
        back
        title={t('order.orderNumber', { code: order.code })}
        subtitle={order.publisherName}
      />

      <Screen>
        <Card level={0} style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {t('order.status')}
            </Text>
            <Badge label={t(orderStatusLabelKey(order.status))} tone={orderStatusTone(order.status)} />
          </View>

          {/* Delivery timeline */}
          <View style={{ gap: 0 }}>
            {(cancelled ? ['cancelled' as const] : ORDER_TIMELINE).map((status, index, all) => {
              const done = reached.has(status);
              const event = order.timeline.find((e) => e.status === status);
              const last = index === all.length - 1;

              return (
                <View key={status} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                  <View style={{ alignItems: 'center', width: 24 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: cancelled
                          ? theme.colors.dangerSoft
                          : done
                            ? theme.colors.primary
                            : theme.colors.subtle,
                      }}
                    >
                      {cancelled ? (
                        <XCircle size={13} color={theme.colors.danger} />
                      ) : done ? (
                        <Check size={13} color={theme.colors.primaryFg} />
                      ) : null}
                    </View>
                    {!last ? (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          minHeight: 26,
                          backgroundColor: done ? theme.colors.primary : theme.colors.border,
                        }}
                      />
                    ) : null}
                  </View>

                  <View style={{ flex: 1, paddingBottom: last ? 0 : theme.spacing.md }}>
                    <Text variant="smallStrong" color={done || cancelled ? 'fg' : 'fgSubtle'}>
                      {t(orderStatusLabelKey(status))}
                    </Text>
                    {event ? (
                      <Text variant="caption" color="fgSubtle">
                        {formatDateTime(event.at, locale)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        <Section title={t('order.items')}>
          <Card level={0} style={{ gap: theme.spacing.md }}>
            {order.items.map((line) => (
              <View key={line.bookId} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                <BookCover title={line.title} uri={line.coverUrl} width={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="smallStrong" numberOfLines={2}>
                    {line.title}
                  </Text>
                  <Text variant="caption" color="fgSubtle">
                    {line.authorName} · {line.quantity} ×{' '}
                    {formatPrice(line.price, locale)}
                  </Text>
                </View>
                <Text variant="smallStrong">
                  {formatPrice(line.price * line.quantity, locale)}
                </Text>
              </View>
            ))}
          </Card>
        </Section>

        <Section title={t('order.deliveryTo')}>
          <Card level={0} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <MapPin size={18} color={theme.colors.fgMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{order.address.fullName}</Text>
              <Text variant="small" color="fgMuted">
                {order.address.phone}
              </Text>
              <Text variant="small" color="fgMuted">
                {order.address.city}
                {order.address.line ? `, ${order.address.line}` : ''}
              </Text>
              {order.address.note ? (
                <Text variant="caption" color="fgSubtle">
                  {order.address.note}
                </Text>
              ) : null}
            </View>
          </Card>
        </Section>

        <Section title={t('checkout.orderSummary')}>
          <Card level={0} style={{ gap: theme.spacing.sm }}>
            <Row label={t('cart.subtotal')} value={formatPrice(order.subtotal, locale)} />
            <Row label={t('cart.deliveryFee')} value={formatPrice(order.deliveryFee, locale)} />
            {order.discount > 0 ? (
              <Row label={t('checkout.giftCard')} value={`−${formatPrice(order.discount, locale)}`} />
            ) : null}
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
            <Row label={t('cart.total')} value={formatPrice(order.total, locale)} strong />
            <Row
              label={t('order.paymentMethod')}
              value={t(
                order.paymentMethod === 'card'
                  ? 'checkout.card'
                  : order.paymentMethod === 'cod'
                    ? 'checkout.cod'
                    : order.paymentMethod === 'wallet'
                      ? 'checkout.wallet'
                      : 'checkout.posOnDelivery',
              )}
            />
          </Card>
        </Section>

        <Button
          title={t('order.receipt')}
          variant="outline"
          icon={<ReceiptIcon size={16} color={theme.colors.fg} />}
          onPress={() => setReceiptOpen(true)}
        />

        {canCancel ? (
          <Button title={t('order.cancel')} variant="ghost" onPress={() => setConfirmCancel(true)} />
        ) : null}
      </Screen>

      <Sheet visible={receiptOpen} onClose={() => setReceiptOpen(false)} title={t('order.receipt')}>
        {receipt ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="caption" color="fgSubtle">
              {t('order.orderNumber', { code: receipt.code })} ·{' '}
              {formatDateTime(receipt.issuedAt, locale)}
            </Text>
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
            {receipt.lines.map((line, i) => (
              <Row
                key={i}
                label={`${line.quantity} × ${line.title}`}
                value={formatPrice(line.total, locale)}
              />
            ))}
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
            <Row label={t('cart.deliveryFee')} value={formatPrice(receipt.deliveryFee, locale)} />
            <Row label={t('cart.total')} value={formatPrice(receipt.total, locale)} strong />
          </View>
        ) : (
          <Skeleton height={120} />
        )}
      </Sheet>

      <Sheet visible={confirmCancel} onClose={() => setConfirmCancel(false)} title={t('order.cancel')}>
        <Text variant="body" color="fgMuted">
          {t('order.cancelConfirm')}
        </Text>
        <Button
          title={t('order.cancel')}
          variant="danger"
          loading={cancel.isPending}
          onPress={async () => {
            try {
              await cancel.mutateAsync(order.id);
              setConfirmCancel(false);
            } catch {
              toast.error(t('errors.generic'));
            }
          }}
        />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setConfirmCancel(false)} />
      </Sheet>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant={strong ? 'bodyStrong' : 'small'} color={strong ? 'fg' : 'fgMuted'} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'smallStrong'} color={strong ? 'primary' : 'fg'}>
        {value}
      </Text>
    </View>
  );
}
