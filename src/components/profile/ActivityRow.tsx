import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Award, BookOpen, CheckCircle2, MessageSquare, Quote } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, type Translate } from '@/i18n';
import { formatRelative } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { BookCover } from '@/components/book/BookCover';
import type { ActivityItem } from '@/types';

/** One line in the friends-activity feed. */
export function ActivityRow({ item }: { item: ActivityItem }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { Icon, label } = describe(item, t);

  const open = () => {
    if (item.quoteId) router.push(`/quote/${item.quoteId}`);
    else if (item.book) router.push(`/book/${item.book.id}`);
    else router.push(`/user/${item.user.username}`);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.user.name} — ${label}`}
      onPress={open}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? theme.colors.subtle : 'transparent',
      })}
    >
      <Avatar name={item.user.name} uri={item.user.avatarUrl} size={38} />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={13} color={theme.colors.primary} />
          <Text variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>
            {item.user.name}
          </Text>
        </View>
        <Text variant="small" color="fgMuted" numberOfLines={2}>
          {label}
        </Text>
        <Text variant="caption" color="fgSubtle">
          {formatRelative(item.createdAt, locale)}
        </Text>
      </View>

      {item.book ? (
        <BookCover title={item.book.title} uri={item.book.coverUrl} width={34} />
      ) : null}
    </Pressable>
  );
}

function describe(item: ActivityItem, t: Translate) {
  const title = item.book?.title ?? '';
  switch (item.kind) {
    case 'finished_book':
      return { Icon: CheckCircle2, label: `${t('shelf.read')} · ${title}` };
    case 'started_book':
      return { Icon: BookOpen, label: `${t('shelf.reading')} · ${title}` };
    case 'posted_quote':
      return { Icon: Quote, label: `${t('quote.newQuote')} · ${title}` };
    case 'posted_review':
      return { Icon: MessageSquare, label: `${t('book.writeReview')} · ${title}` };
    case 'earned_badge':
      return { Icon: Award, label: item.badgeName ?? t('game.badges') };
  }
}
