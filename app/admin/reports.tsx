import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { CheckCircle2, Flag, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, type TranslationKey } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useAdminReports, useResolveReport } from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { ReportReason, ReportStatus } from '@/types';

const REASON_KEYS: Record<ReportReason, TranslationKey> = {
  spam: 'admin.reasonSpam',
  offensive: 'admin.reasonOffensive',
  spoiler: 'admin.reasonSpoiler',
  copyright: 'admin.reasonCopyright',
  other: 'admin.reasonOther',
};

/** Moderation queue — the spec's panel for removing reported content. */
export default function AdminReportsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const toast = useToast();

  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [status, setStatus] = useState<ReportStatus>('open');
  const { data: reports, isLoading } = useAdminReports(status, isAdmin);
  const resolve = useResolveReport();

  const act = async (id: string, action: 'keep' | 'remove') => {
    try {
      await resolve.mutateAsync({ id, action });
      toast.success(action === 'remove' ? t('admin.remove') : t('admin.approve'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader back title={t('admin.reports')} />

      <FlatList
        data={reports}
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
        ListHeaderComponent={
          <SegmentedControl
            value={status}
            onChange={setStatus}
            style={{ marginBottom: theme.spacing.sm }}
            options={[
              { value: 'open', label: t('admin.openReports') },
              { value: 'kept', label: t('admin.approve') },
              { value: 'removed', label: t('admin.remove') },
            ]}
          />
        }
        renderItem={({ item }) => (
          <Card level={0} style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Badge
                label={t(REASON_KEYS[item.reason])}
                tone={item.reason === 'offensive' ? 'danger' : 'warning'}
              />
              <Badge
                label={item.targetType === 'review' ? t('admin.reviews') : t('admin.quotes')}
                tone="neutral"
              />
              <View style={{ flex: 1 }} />
              <Text variant="caption" color="fgSubtle">
                {formatRelative(item.createdAt, locale)}
              </Text>
            </View>

            {/* Snapshot of the reported content, kept even after removal. */}
            <View
              style={{
                gap: 6,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.subtle,
              }}
            >
              <Text variant="small" style={{ fontStyle: 'italic' }}>
                “{item.snapshot.text}”
              </Text>
              <Text variant="caption" color="fgSubtle">
                {item.snapshot.authorName}
                {item.snapshot.bookTitle ? ` · ${item.snapshot.bookTitle}` : ''}
              </Text>
            </View>

            <Text variant="caption" color="fgSubtle">
              {t('admin.reportedBy', { name: item.reportedBy.name })}
              {item.note ? ` — ${item.note}` : ''}
            </Text>

            {item.status === 'open' ? (
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Button
                  title={t('admin.approve')}
                  variant="outline"
                  style={{ flex: 1 }}
                  icon={<CheckCircle2 size={15} color={theme.colors.fg} />}
                  onPress={() => act(item.id, 'keep')}
                />
                <Button
                  title={t('admin.remove')}
                  variant="danger"
                  style={{ flex: 1 }}
                  icon={<Trash2 size={15} color={theme.colors.primaryFg} />}
                  onPress={() => act(item.id, 'remove')}
                />
              </View>
            ) : (
              <Badge
                label={item.status === 'removed' ? t('admin.remove') : t('admin.resolved')}
                tone={item.status === 'removed' ? 'danger' : 'success'}
              />
            )}
          </Card>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={190} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState icon={<Flag size={22} color={theme.colors.fgSubtle} />} title={t('admin.empty')} />
          )
        }
      />
    </>
  );
}
