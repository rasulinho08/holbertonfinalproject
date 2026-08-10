import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, SearchX } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { ApiError } from '@/api/errors';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  /** Skeleton block heights while loading. */
  skeleton?: number[];
  onRetry?: () => void;
}

/**
 * What a detail screen shows before it has data.
 *
 * Screens were guarding with `isLoading || !data`, which quietly conflates two
 * very different situations: still fetching, and finished but empty. A request
 * that 404s or fails leaves `isLoading` false and `data` undefined, so the
 * skeleton branch renders *forever* — a couple of grey blocks with no message,
 * no retry, and no explanation. On the order tracking screen that reads as a
 * blank page.
 *
 * Loading gets skeletons. A failure gets a reason and a way out.
 */
export function QueryState({ isLoading, error, skeleton = [120, 220], onRetry }: QueryStateProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <View style={{ gap: theme.spacing.lg }}>
        {skeleton.map((height, i) => (
          <Skeleton key={i} height={height} radius={theme.radius.lg} />
        ))}
      </View>
    );
  }

  // A 404 is not a failure the reader can retry their way out of — the thing is
  // gone — so it offers navigation instead of a retry button.
  const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';
  const offline = error instanceof ApiError && !!error.isRetryable;

  return (
    <EmptyState
      icon={
        notFound ? (
          <SearchX size={22} color={theme.colors.fgSubtle} />
        ) : (
          <CloudOff size={22} color={theme.colors.fgSubtle} />
        )
      }
      title={notFound ? t('errors.notFound') : t('errors.generic')}
      hint={offline ? t('errors.network') : undefined}
      actionLabel={notFound || !onRetry ? t('common.back') : t('common.retry')}
      onAction={notFound || !onRetry ? () => router.back() : onRetry}
    />
  );
}
