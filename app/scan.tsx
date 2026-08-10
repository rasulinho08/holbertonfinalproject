import React, { useCallback, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Keyboard as KeyboardIcon, ScanLine } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBooks } from '@/api/hooks';
import { useDebounced } from '@/lib/hooks';
import * as haptics from '@/lib/haptics';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ShelfPicker } from '@/components/book/ShelfPicker';
import { Text } from '@/components/ui/Text';
import type { Book } from '@/types';

/**
 * Add a physical book by scanning its barcode.
 *
 * Most books in Azerbaijan are paper, and typing a title in a language the
 * keyboard fights you over is the slowest way into a catalogue of a thousand.
 * The barcode on the back is an ISBN, the catalogue is indexed by ISBN, and the
 * search endpoint already matches on it — so this is a camera pointed at an
 * existing query.
 *
 * Manual entry sits alongside the camera rather than behind a failure, because
 * a worn or missing barcode is common on second-hand books and the fallback
 * should not feel like an error state.
 */
export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const [permission, requestPermission] = useCameraPermissions();
  const [isbn, setIsbn] = useState('');
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [picking, setPicking] = useState<Book | null>(null);

  // The scanner fires continuously while a code is in frame. Without this the
  // same book would be looked up dozens of times a second.
  const lastScanned = useRef<string | null>(null);

  const debounced = useDebounced(isbn, 300);
  const { data, isFetching } = useBooks(debounced.length >= 10 ? { q: debounced } : {});
  const match = debounced.length >= 10 ? (data?.pages[0]?.data[0] ?? null) : null;
  const searched = debounced.length >= 10 && !isFetching;

  const onScanned = useCallback(
    ({ data: code }: { data: string }) => {
      const digits = code.replace(/[^0-9Xx]/g, '');
      // ISBN-10 and ISBN-13 only; a barcode on the packaging of anything else
      // would otherwise trigger a pointless search.
      if (digits.length !== 10 && digits.length !== 13) return;
      if (lastScanned.current === digits) return;

      lastScanned.current = digits;
      void haptics.success();
      setIsbn(digits);
    },
    [],
  );

  const permissionDenied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <>
      <AppHeader back title={t('scan.title')} />

      <Screen contentStyle={{ gap: theme.spacing.lg }}>
        {/* The camera is not available on the web build, so that platform goes
            straight to manual entry rather than showing a permission prompt
            that can never succeed. */}
        {!manual && Platform.OS !== 'web' ? (
          <View
            style={{
              height: 260,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.subtle,
              justifyContent: 'center',
            }}
          >
            {permission?.granted ? (
              <>
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
                  onBarcodeScanned={onScanned}
                />
                {/* A frame to aim with. Scanning works across the whole view,
                    but people hold the phone very differently without one. */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: '12%',
                    right: '12%',
                    top: '28%',
                    bottom: '28%',
                    borderWidth: 2,
                    borderColor: theme.colors.primaryFg,
                    borderRadius: theme.radius.md,
                    opacity: 0.85,
                  }}
                />
              </>
            ) : (
              <EmptyState
                compact
                icon={<Camera size={22} color={theme.colors.fgSubtle} />}
                title={t('scan.permissionTitle')}
                hint={permissionDenied ? t('scan.permissionDenied') : t('scan.permissionHint')}
                actionLabel={permissionDenied ? undefined : t('scan.allow')}
                onAction={permissionDenied ? undefined : () => void requestPermission()}
              />
            )}
          </View>
        ) : null}

        {manual || Platform.OS === 'web' ? (
          <Input
            label={t('scan.isbn')}
            value={isbn}
            onChangeText={(v) => setIsbn(v.replace(/[^0-9Xx]/g, ''))}
            placeholder="9780735211292"
            keyboardType="number-pad"
            maxLength={13}
            hint={t('scan.isbnHint')}
          />
        ) : (
          <Button
            title={t('scan.enterManually')}
            variant="ghost"
            icon={<KeyboardIcon size={16} color={theme.colors.primary} />}
            onPress={() => setManual(true)}
          />
        )}

        {/* Result */}
        {match ? (
          <Card level={0} style={{ gap: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
              <BookCover title={match.title} uri={match.coverUrl} width={72} />
              <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
                <Text variant="bodyStrong" numberOfLines={3}>
                  {match.title}
                </Text>
                <Text variant="small" color="fgMuted" numberOfLines={1}>
                  {match.authorName}
                </Text>
                <Text variant="caption" color="fgSubtle">
                  {match.pageCount} {t('common.pages')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Button
                title={t('book.addToShelf')}
                style={{ flex: 1 }}
                onPress={() => setPicking(match)}
              />
              <Button
                title={t('common.showMore')}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push(`/book/${match.id}`)}
              />
            </View>
          </Card>
        ) : searched ? (
          // A book we do not stock is the expected outcome for a lot of shelves,
          // so it offers the next step rather than just reporting failure.
          <EmptyState
            icon={<ScanLine size={22} color={theme.colors.fgSubtle} />}
            title={t('scan.notFound')}
            hint={t('scan.notFoundHint')}
            actionLabel={t('nav.explore')}
            onAction={() => router.push('/explore')}
          />
        ) : (
          <Text variant="small" color="fgSubtle">
            {t('scan.hint')}
          </Text>
        )}
      </Screen>

      <ShelfPicker
        book={picking}
        visible={!!picking}
        onClose={() => {
          setPicking(null);
          // Cleared so pointing at the same book again is treated as new.
          lastScanned.current = null;
          setIsbn('');
        }}
      />
    </>
  );
}
