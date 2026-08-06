import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { ReportReason } from '@/types';

const REASONS: { value: ReportReason; labelKey: 'reasonSpam' | 'reasonOffensive' | 'reasonSpoiler' | 'reasonCopyright' | 'reasonOther' }[] = [
  { value: 'spam', labelKey: 'reasonSpam' },
  { value: 'offensive', labelKey: 'reasonOffensive' },
  { value: 'spoiler', labelKey: 'reasonSpoiler' },
  { value: 'copyright', labelKey: 'reasonCopyright' },
  { value: 'other', labelKey: 'reasonOther' },
];

export interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, note: string) => Promise<void>;
}

/** Feeds the moderation queue in `/admin/reports`. */
export function ReportSheet({ visible, onClose, onSubmit }: ReportSheetProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(reason, note.trim());
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('common.report')}>
      <Text variant="small" color="fgMuted">
        {t('admin.reason')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {REASONS.map((option) => (
          <Chip
            key={option.value}
            label={t(`admin.${option.labelKey}`)}
            selected={reason === option.value}
            onPress={() => setReason(option.value)}
          />
        ))}
      </View>

      <Input
        label={`${t('checkout.note')} (${t('common.optional')})`}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder={t('checkout.notePlaceholder')}
      />

      <Button title={t('common.report')} variant="danger" loading={busy} onPress={submit} />
    </Sheet>
  );
}
