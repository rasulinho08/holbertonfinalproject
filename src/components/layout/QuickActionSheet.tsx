import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookPlus,
  ShoppingBag,
  Tag,
  Quote as QuoteIcon,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import * as haptics from '@/lib/haptics';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';

export interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ visible, onClose }: QuickActionSheetProps) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  type PushArg = Parameters<typeof router.push>[0];

  const isAz = locale?.startsWith('az');

  const actions: {
    key: string;
    title: string;
    description: string;
    Icon: React.ComponentType<any>;
    color: string;
    bg: string;
    route: PushArg;
  }[] = [
    {
      key: 'add-book',
      // Добавление в личную библиотеку
      title: isAz ? 'Kitab əlavə et' : 'Add a book',
      description: isAz ? 'Oxuduğun və ya oxuyacağın kitabı əlavə et' : 'Add to your personal library',
      Icon: BookPlus,
      color: theme.colors.primary,
      bg: theme.colors.primarySoft,
      route: '/shelves' as PushArg,
    },
    {
      key: 'sell-book',
      // Выставить на продажу
      title: isAz ? 'Kitab sat' : 'Sell a book',
      description: isAz ? 'Kitabını satışa çıxar' : 'List your book for sale',
      Icon: Tag,
      color: theme.colors.warning,
      bg: theme.colors.warningSoft,
      route: '/publisher/books/new' as PushArg,
    },
    {
      key: 'buy-book',
      title: t('book.buyNow') || (isAz ? 'Kitab al' : 'Buy now'),
      description: t('cart.continueShopping') || (isAz ? 'Kataloqa keçid et' : 'Continue shopping'),
      Icon: ShoppingBag,
      color: theme.colors.success,
      bg: theme.colors.successSoft,
      route: '/explore' as PushArg,
    },
    {
      key: 'add-quote',
      title: t('quote.newQuote') || (isAz ? 'Sitat əlavə et' : 'Share a quote'),
      description: t('quote.quotePlaceholder') || (isAz ? 'Sevdiriyin sitatı paylaş' : 'Type the passage that stayed with you...'),
      Icon: QuoteIcon,
      color: theme.colors.rating,
      bg: theme.colors.card,
      route: '/quote/new' as PushArg,
    },
    {
      key: 'start-buddy',
      title: t('book.startBuddyRead') || (isAz ? 'Birgə oxu başla' : 'Start a buddy read'),
      description: t('buddy.emptyHint') || (isAz ? 'Dostlarınla birgə oxu' : 'Start reading the same book with a friend.'),
      Icon: Users,
      color: theme.colors.fgMuted,
      bg: theme.colors.subtle,
      route: '/buddy-reads' as PushArg,
    },
  ];

  const onAction = (route: PushArg, label: string) => {
    haptics.tap();
    onClose();
    setTimeout(() => {
      try {
        router.push(route);
      } catch (e) {
        // swallow navigation errors
      }
    }, 120);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('common.create')}>
      <View style={{ gap: theme.spacing.md }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={`${action.title} — ${action.description}`}
            onPress={() => onAction(action.route, action.key)}
            style={({ pressed }) => [
              styles.row,
              {
                minHeight: 64,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.subtle : 'transparent',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: action.bg,
                }}
              >
                <action.Icon size={20} color={action.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{action.title}</Text>
                <Text variant="small" color="fgMuted" numberOfLines={1}>
                  {action.description}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
});

export default QuickActionSheet;