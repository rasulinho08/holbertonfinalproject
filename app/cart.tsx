import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Store, Trash2, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/api/hooks';
import { formatPrice } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

/**
 * Multi-vendor cart. Lines are grouped by publisher because each publisher
 * ships its own parcel and is billed its own delivery fee — checkout then
 * creates one order per group.
 */
export default function CartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();

  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const empty = !cart || cart.itemCount === 0;

  return (
    <>
      <AppHeader back title={t('cart.title')} subtitle={cart ? t('cart.itemsCount', { count: cart.itemCount }) : undefined} />

      <Screen bottomInset={empty ? 0 : 150}>
        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={150} radius={theme.radius.lg} />
            ))}
          </View>
        ) : empty ? (
          <EmptyState
            icon={<ShoppingBag size={22} color={theme.colors.fgSubtle} />}
            title={t('cart.empty')}
            hint={t('cart.emptyHint')}
            actionLabel={t('cart.continueShopping')}
            onAction={() => router.push('/explore')}
          />
        ) : (
          <>
            <Text variant="small" color="fgSubtle">
              {t('cart.vendorNote')}
            </Text>

            {cart.groups.map((group) => (
              <Card key={group.publisherId} level={0} style={{ gap: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Store size={16} color={theme.colors.fgMuted} />
                  <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {group.publisherName}
                  </Text>
                  <Badge
                    label={
                      group.deliveryFee === 0
                        ? t('cart.deliveryFee')
                        : formatPrice(group.deliveryFee, locale)
                    }
                    tone={group.deliveryFee === 0 ? 'success' : 'neutral'}
                  />
                </View>

                {group.items.map((item) => (
                  <View
                    key={item.bookId}
                    style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}
                  >
                    <BookCover title={item.book.title} uri={item.book.coverUrl} width={48} />

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="smallStrong" numberOfLines={2}>
                        {item.book.title}
                      </Text>
                      <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                        {item.book.authorName}
                      </Text>
                      <Text variant="bodyStrong" color="primary">
                        {formatPrice(item.book.price * item.quantity, locale)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: theme.spacing.sm }}>
                      <Stepper
                        value={item.quantity}
                        max={Math.max(1, item.book.stock)}
                        label={item.book.title}
                        onChange={(quantity) =>
                          updateItem.mutate({ bookId: item.bookId, quantity })
                        }
                      />
                      <IconButton
                        label={t('cart.remove')}
                        size={30}
                        onPress={() => {
                          removeItem.mutate(item.bookId);
                          toast.info(t('cart.removed'));
                        }}
                      >
                        <Trash2 size={15} color={theme.colors.fgSubtle} />
                      </IconButton>
                    </View>
                  </View>
                ))}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: theme.spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <Text variant="small" color="fgMuted">
                    {t('cart.subtotal')}
                  </Text>
                  <Text variant="smallStrong">{formatPrice(group.subtotal, locale)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>

      {!empty && cart ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <SummaryRow label={t('cart.subtotal')} value={formatPrice(cart.subtotal, locale)} />
          <SummaryRow label={t('cart.deliveryFee')} value={formatPrice(cart.deliveryTotal, locale)} />
          <SummaryRow label={t('cart.total')} value={formatPrice(cart.total, locale)} strong />
          <Button title={t('cart.checkout')} onPress={() => router.push('/checkout')} />
        </View>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'bodyStrong' : 'small'} color={strong ? 'fg' : 'fgMuted'}>
        {label}
      </Text>
      <Text variant={strong ? 'h3' : 'smallStrong'} color={strong ? 'primary' : 'fg'}>
        {value}
      </Text>
    </View>
  );
}
