import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudOff, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useOffline } from '@/store/offline';
import { Text } from '@/components/ui/Text';

/**
 * Thin strip under the status bar shown while the device is offline, or while
 * the queued writes from `store/offline.ts` are being replayed.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const online = useOffline((s) => s.online);
  const syncing = useOffline((s) => s.syncing);
  const pending = useOffline((s) => s.queue.length);

  if (online && !syncing) return null;

  const offline = !online;
  const label = offline
    ? pending > 0
      ? `${t('common.offline')} · ${pending}`
      : t('common.offline')
    : t('common.syncing');

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        paddingTop: insets.top + 4,
        paddingBottom: 6,
        paddingHorizontal: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        backgroundColor: offline ? theme.colors.warningSoft : theme.colors.infoSoft,
      }}
    >
      {offline ? (
        <CloudOff size={14} color={theme.colors.warning} />
      ) : (
        <RefreshCw size={14} color={theme.colors.info} />
      )}
      <Text variant="caption" style={{ color: offline ? theme.colors.warning : theme.colors.info }}>
        {label}
      </Text>
    </View>
  );
}
