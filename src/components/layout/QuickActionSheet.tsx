import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookPlus,
  ShoppingBag,
  Tag,
  MessageSquarePlus,
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
  const { t } = useI18n();
  const router = useRouter();
  type PushArg = Parameters<typeof router.push>[0];

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
      title: t('publisher.addBook'),
      description: t('publisher.myBooks'),
      Icon: BookPlus,
      color: theme.colors.primary,
      bg: theme.colors.primarySoft,
      route: '/publisher/books/new',
    },
    {
      key: 'buy-book',
      title: t('book.buyNow'),
      description: t('cart.continueShopping'),
      Icon: ShoppingBag,
      color: theme.colors.success,
      bg: theme.colors.successSoft,
      route: '/explore',
    },
    {
      key: 'sell-book',
      title: t('publisher.addBook'),
      description: t('publisher.myBooks'),
      Icon: Tag,
      color: theme.colors.warning,
      bg: theme.colors.warningSoft,
      route: '/publisher/books/new',
    },
    {
      key: 'add-review',
      title: t('book.writeReview'),
      description: t('review.reviewPlaceholder'),
      Icon: MessageSquarePlus,
      color: theme.colors.info,
      bg: theme.colors.infoSoft,
      route: '/review/new',
    },
    {
      key: 'add-quote',
      title: t('quote.newQuote'),
      description: t('quote.quotePlaceholder'),
      Icon: QuoteIcon,
      color: theme.colors.rating,
      bg: theme.colors.card, // no dedicated soft for rating — use card as neutral bg
      route: '/quote/new',
    },
    {
      key: 'start-buddy',
      title: t('book.startBuddyRead'),
      description: t('buddy.emptyHint'),
      Icon: Users,
      color: theme.colors.fgMuted,
      bg: theme.colors.subtle,
      route: '/buddy-reads',
    },
  ];

  const onAction = (route: PushArg, label: string) => {
    // lightweight haptic, close sheet, then navigate after a short delay
    haptics.tap();
    onClose();
    setTimeout(() => {
      // navigate after sheet starts closing to avoid visual conflict
      try {
        router.push(route);
      } catch (e) {
        // swallow navigation errors — router may be unavailable in tests
      }
    }, 120);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('common.create') /* reuse generic key */}>
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
