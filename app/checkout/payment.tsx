import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banknote, CreditCard, Gift, ShieldCheck, Smartphone, Wallet } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCart, usePlaceOrder, useRedeemGiftCard, useWallet } from '@/api/hooks';
import { useCheckout } from '@/store/checkout';
import { formatPrice } from '@/lib/format';
import { serverMessage } from '@/api/errors';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { PaymentMethod } from '@/types';

const METHODS: {
  value: PaymentMethod;
  titleKey: 'card' | 'cod' | 'posOnDelivery' | 'wallet';
  hintKey: 'cardHint' | 'codHint' | 'posHint' | 'walletHint';
  Icon: typeof CreditCard;
}[] = [
  { value: 'card', titleKey: 'card', hintKey: 'cardHint', Icon: CreditCard },
  { value: 'cod', titleKey: 'cod', hintKey: 'codHint', Icon: Banknote },
  { value: 'pos_on_delivery', titleKey: 'posOnDelivery', hintKey: 'posHint', Icon: Smartphone },
  { value: 'wallet', titleKey: 'wallet', hintKey: 'walletHint', Icon: Wallet },
];

export default function CheckoutPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();

  const { data: cart } = useCart();
  const { data: wallet } = useWallet();
  const {
    address,
    deliveryMethod,
    paymentMethod,
    giftCardCode,
    giftCardAmount,
    setPaymentMethod,
    applyGiftCard,
    clearGiftCard,
    reset,
  } = useCheckout();

  const placeOrder = usePlaceOrder();
  const redeem = useRedeemGiftCard();

  const [code, setCode] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', holder: '' });

  const deliveryTotal = deliveryMethod === 'pickup' ? 0 : (cart?.deliveryTotal ?? 0);
  const subtotal = cart?.subtotal ?? 0;
  const total = Math.max(0, subtotal + deliveryTotal - giftCardAmount);

  const walletShort = paymentMethod === 'wallet' && (wallet?.balance ?? 0) < total;

  const redeemCode = async () => {
    if (!code.trim()) return;
    try {
      const result = await redeem.mutateAsync(code.trim());
      applyGiftCard(result.code, result.amount);
      toast.success(t('checkout.giftCardApplied'));
      setCode('');
    } catch {
      toast.error(t('checkout.giftCardInvalid'));
    }
  };

  const submit = async () => {
    try {
      const orders = await placeOrder.mutateAsync({
        address,
        deliveryMethod,
        paymentMethod,
        giftCardCode: giftCardCode ?? undefined,
      });
      reset();
      router.replace({
        pathname: '/checkout/success',
        params: { orderId: orders[0].id, code: orders[0].code, count: String(orders.length) },
      });
    } catch (error) {
      toast.error(serverMessage(error) ?? t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader back title={t('checkout.payment')} />

      <Screen keyboardAware bottomInset={150}>
        <Section title={t('checkout.payment')}>
          <View style={{ gap: theme.spacing.sm }}>
            {METHODS.map(({ value, titleKey, hintKey, Icon }) => {
              const selected = paymentMethod === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`checkout.${titleKey}`)}
                  onPress={() => setPaymentMethod(value)}
                >
                  <Card
                    level={0}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      borderWidth: selected ? 2 : 1,
                    }}
                  >
                    <Icon size={20} color={selected ? theme.colors.primary : theme.colors.fgMuted} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{t(`checkout.${titleKey}`)}</Text>
                      <Text variant="small" color="fgMuted">
                        {hintKey === 'walletHint'
                          ? t('checkout.walletHint', {
                              balance: formatPrice(wallet?.balance ?? 0, locale),
                            })
                          : t(`checkout.${hintKey}`)}
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          {walletShort ? (
            <Text variant="small" color="danger">
              {t('errors.generic')}
            </Text>
          ) : null}
        </Section>

        {/* Card details are collected for realism; the real flow redirects to
            Payriff's hosted page (see backend-guide/INTEGRATIONS.md). */}
        {paymentMethod === 'card' ? (
          <Section title={t('checkout.card')}>
            <View style={{ gap: theme.spacing.md }}>
              <Input
                label={t('checkout.cardNumber')}
                value={card.number}
                onChangeText={(number) => setCard((c) => ({ ...c, number }))}
                keyboardType="number-pad"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('checkout.cardExpiry')}
                  value={card.expiry}
                  onChangeText={(expiry) => setCard((c) => ({ ...c, expiry }))}
                  placeholder="12/28"
                  maxLength={5}
                />
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('checkout.cardCvv')}
                  value={card.cvv}
                  onChangeText={(cvv) => setCard((c) => ({ ...c, cvv }))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
              <Input
                label={t('checkout.cardHolder')}
                value={card.holder}
                onChangeText={(holder) => setCard((c) => ({ ...c, holder }))}
                autoCapitalize="characters"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <ShieldCheck size={14} color={theme.colors.success} />
                <Text variant="caption" color="fgSubtle" style={{ flex: 1 }}>
                  {t('checkout.secureNote')}
                </Text>
              </View>
            </View>
          </Section>
        ) : null}

        <Section title={t('checkout.giftCard')}>
          {giftCardCode ? (
            <Card level={0} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Gift size={18} color={theme.colors.success} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{giftCardCode}</Text>
                <Text variant="small" color="success">
                  −{formatPrice(giftCardAmount, locale)}
                </Text>
              </View>
              <Button
                title={t('common.delete')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={clearGiftCard}
              />
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
              <Input
                containerStyle={{ flex: 1 }}
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder={t('checkout.giftCardPlaceholder')}
                autoCapitalize="characters"
              />
              <Button
                title={t('checkout.giftCardApply')}
                variant="outline"
                fullWidth={false}
                loading={redeem.isPending}
                onPress={redeemCode}
              />
            </View>
          )}
        </Section>

        <Section title={t('checkout.orderSummary')}>
          <Card level={0} style={{ gap: theme.spacing.sm }}>
            <Row label={t('cart.subtotal')} value={formatPrice(subtotal, locale)} />
            <Row label={t('cart.deliveryFee')} value={formatPrice(deliveryTotal, locale)} />
            {giftCardAmount > 0 ? (
              <Row label={t('checkout.giftCard')} value={`−${formatPrice(giftCardAmount, locale)}`} />
            ) : null}
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
            <Row label={t('cart.total')} value={formatPrice(total, locale)} strong />
            <Badge
              label={`${t('checkout.estimatedDelivery')}: ${
                deliveryMethod === 'post' ? t('checkout.postHint') : t('checkout.courierHint')
              }`}
              tone="info"
            />
          </Card>
        </Section>
      </Screen>

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="bodyStrong">{t('cart.total')}</Text>
          <Text variant="h3" color="primary">
            {formatPrice(total, locale)}
          </Text>
        </View>
        <Button
          title={t('checkout.placeOrder')}
          loading={placeOrder.isPending}
          disabled={walletShort || !cart || cart.itemCount === 0}
          onPress={submit}
        />
      </View>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'bodyStrong' : 'small'} color={strong ? 'fg' : 'fgMuted'}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'smallStrong'} color={strong ? 'primary' : 'fg'}>
        {value}
      </Text>
    </View>
  );
}
