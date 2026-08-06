import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Phone, Truck, User as UserIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCart } from '@/api/hooks';
import { useCurrentUser } from '@/store/auth';
import { AZ_CITIES, useCheckout } from '@/store/checkout';
import * as validate from '@/lib/validation';
import { formatPrice } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { DeliveryMethod } from '@/types';

const DELIVERY_OPTIONS: {
  value: DeliveryMethod;
  titleKey: 'courier' | 'pickup' | 'post';
  hintKey: 'courierHint' | 'pickupHint' | 'postHint';
}[] = [
  { value: 'courier', titleKey: 'courier', hintKey: 'courierHint' },
  { value: 'pickup', titleKey: 'pickup', hintKey: 'pickupHint' },
  { value: 'post', titleKey: 'post', hintKey: 'postHint' },
];

export default function CheckoutAddressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const user = useCurrentUser();

  const { data: cart } = useCart();
  const { address, deliveryMethod, setAddress, setDeliveryMethod } = useCheckout();
  const [errors, setErrors] = useState<Record<string, validate.FieldError>>({});

  // Prefill the name once, from the signed-in profile.
  React.useEffect(() => {
    if (!address.fullName && user?.name) setAddress({ fullName: user.name });
  }, [address.fullName, user?.name, setAddress]);

  const proceed = () => {
    const next = {
      fullName: validate.required(address.fullName),
      phone: validate.phone(address.phone),
      city: validate.required(address.city),
      line: deliveryMethod === 'pickup' ? null : validate.required(address.line),
    };
    setErrors(next);
    if (!validate.isValid(next)) return;
    router.push('/checkout/payment');
  };

  return (
    <>
      <AppHeader back title={t('checkout.title')} />

      <Screen keyboardAware bottomInset={92}>
        <Section title={t('checkout.deliveryInfo')}>
          <View style={{ gap: theme.spacing.md }}>
            <Input
              label={t('checkout.fullName')}
              value={address.fullName}
              onChangeText={(fullName) => setAddress({ fullName })}
              error={errors.fullName ? t(errors.fullName) : undefined}
              icon={<UserIcon size={18} color={theme.colors.fgSubtle} />}
            />
            <Input
              label={t('checkout.phone')}
              value={address.phone}
              onChangeText={(phone) => setAddress({ phone })}
              error={errors.phone ? t(errors.phone) : undefined}
              keyboardType="phone-pad"
              placeholder="+994 50 123 45 67"
              icon={<Phone size={18} color={theme.colors.fgSubtle} />}
            />
          </View>
        </Section>

        <Section title={t('checkout.city')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {AZ_CITIES.map((city) => (
              <Chip
                key={city}
                label={city}
                selected={address.city === city}
                onPress={() => setAddress({ city })}
              />
            ))}
          </View>
        </Section>

        {deliveryMethod !== 'pickup' ? (
          <Input
            label={t('checkout.addressLine')}
            value={address.line}
            onChangeText={(line) => setAddress({ line })}
            error={errors.line ? t(errors.line) : undefined}
            placeholder={t('checkout.addressPlaceholder')}
            multiline
            icon={<MapPin size={18} color={theme.colors.fgSubtle} />}
          />
        ) : null}

        <Input
          label={`${t('checkout.note')} (${t('common.optional')})`}
          value={address.note ?? ''}
          onChangeText={(note) => setAddress({ note })}
          placeholder={t('checkout.notePlaceholder')}
        />

        <Section title={t('checkout.deliveryMethod')}>
          <View style={{ gap: theme.spacing.sm }}>
            {DELIVERY_OPTIONS.map((option) => {
              const selected = deliveryMethod === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`checkout.${option.titleKey}`)}
                  onPress={() => setDeliveryMethod(option.value)}
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
                    <Truck size={20} color={selected ? theme.colors.primary : theme.colors.fgMuted} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{t(`checkout.${option.titleKey}`)}</Text>
                      <Text variant="small" color="fgMuted">
                        {t(`checkout.${option.hintKey}`)}
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
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
        {cart ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="small" color="fgMuted">
              {t('cart.total')}
            </Text>
            <Text variant="bodyStrong" color="primary">
              {formatPrice(
                deliveryMethod === 'pickup' ? cart.subtotal : cart.total,
                locale,
              )}
            </Text>
          </View>
        ) : null}
        <Button title={t('common.next')} onPress={proceed} />
      </View>
    </>
  );
}
