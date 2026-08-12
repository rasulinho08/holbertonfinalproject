import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { ShoppingCart, Package, BookPlus, Tag } from 'lucide-react-native';
import { useCartCount } from '@/api/hooks';

export default function MarketplaceTab() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const cartCount = useCartCount();

  return (
    <>
      <AppHeader title={t('nav.marketplace') ?? 'Marketplace'} />
      <Screen>
        <ListGroup>
          <ListRow
            title={t('nav.explore')}
            icon={<ShoppingCart size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/explore')}
          />
          <ListRow
            title={t('cart.title')}
            subtitle={cartCount > 0 ? t('cart.itemsCount', { count: cartCount }) : undefined}
            icon={<Package size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/cart')}
          />
          <ListRow
            title={t('publisher.addBook')}
            icon={<BookPlus size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/publisher/books/new')}
          />
          <ListRow
            title={t('publisher.myBooks')}
            icon={<Tag size={16} color={theme.colors.fgMuted} />}
            onPress={() => router.push('/publisher/books')}
          />
        </ListGroup>
      </Screen>
    </>
  );
}
