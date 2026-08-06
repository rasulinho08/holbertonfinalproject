import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Package } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function CheckoutSuccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { orderId, code, count } = useLocalSearchParams<{
    orderId?: string;
    code?: string;
    count?: string;
  }>();

  const orderCount = Number(count ?? '1');

  return (
    <Screen
      contentStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.lg,
      }}
    >
      <View
        style={{
          width: 92,
          height: 92,
          borderRadius: 46,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.successSoft,
        }}
      >
        <CheckCircle2 size={44} color={theme.colors.success} />
      </View>

      <Text variant="display" center>
        {t('checkout.successTitle')}
      </Text>

      {code ? (
        <Text variant="body" color="fgMuted" center>
          {t('checkout.successHint', { code })}
        </Text>
      ) : null}

      {/* A multi-publisher cart is split into several orders — say so. */}
      {orderCount > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.infoSoft,
          }}
        >
          <Package size={16} color={theme.colors.info} />
          <Text variant="small" style={{ color: theme.colors.info, flex: 1 }}>
            {t('cart.vendorNote')} ({orderCount})
          </Text>
        </View>
      ) : null}

      <View style={{ width: '100%', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
        {orderId ? (
          <Button title={t('checkout.viewOrder')} onPress={() => router.replace(`/orders/${orderId}`)} />
        ) : null}
        <Button title={t('checkout.backHome')} variant="outline" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
