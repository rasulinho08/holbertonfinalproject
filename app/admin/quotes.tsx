import React from 'react';
import { FlatList, View } from 'react-native';
import { Quote as QuoteIcon, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useAdminQuotes, useAdminRemoveQuote } from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function AdminQuotesScreen() {
  const { t } = useI18n();

  return (
    <>
      <AppHeader back title={t('admin.quotes')} />
      <RoleGate role="admin">
        <AdminQuotes />
      </RoleGate>
    </>
  );
}

function AdminQuotes() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const { data: quotes, isLoading } = useAdminQuotes(user?.role === 'admin');
  const remove = useAdminRemoveQuote();

  return (
    <>
      <FlatList
        data={quotes}
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
        renderItem={({ item }) => (
          <Card level={0} style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Avatar name={item.user.name} uri={item.user.avatarUrl} size={32} />
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong" numberOfLines={1}>
                  {item.user.name}
                </Text>
                <Text variant="caption" color="fgSubtle" numberOfLines={1}>
                  {formatRelative(item.createdAt, locale)} · {item.book.title}
                </Text>
              </View>
              <IconButton
                label={t('admin.remove')}
                onPress={async () => {
                  await remove.mutateAsync(item.id);
                  toast.success(t('admin.remove'));
                }}
              >
                <Trash2 size={16} color={theme.colors.danger} />
              </IconButton>
            </View>

            <Text serif variant="small" color="fgMuted" numberOfLines={4}>
              “{item.text}”
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={110} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<QuoteIcon size={22} color={theme.colors.fgSubtle} />}
              title={t('quote.empty')}
            />
          )
        }
      />
    </>
  );
}
