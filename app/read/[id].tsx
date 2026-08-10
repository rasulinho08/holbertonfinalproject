import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pause, Play, RotateCcw, Square } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBook, useBookSessions, useLogReadingSession } from '@/api/hooks';
import { formatRelative, readingPercent } from '@/lib/format';
import { success as successHaptic, tap } from '@/lib/haptics';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { QueryState } from '@/components/ui/QueryState';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

/** `3725` → `"01:02:05"`. */
function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Reading-session timer.
 *
 * The app tracked streaks and a weekly pages chart, but there was no way to
 * record a sitting — progress was a page number you typed in afterwards. This
 * screen is the missing event: start the clock, read, stop, confirm the page
 * you reached. The session feeds the streak, the pages chart and the
 * reading-speed estimate, and also updates the shelf entry, so the old
 * "update progress" flow stays a shortcut rather than the only route.
 */
export default function ReadingSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: book, isLoading, error, refetch } = useBook(id);
  const { data: sessions } = useBookSessions(id);
  const log = useLogReadingSession();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [note, setNote] = useState('');
  const [seeded, setSeeded] = useState(false);

  // Wall-clock anchored rather than tick-counted: a JS interval drifts, and on
  // web it is throttled to once a minute in a background tab, which would
  // silently under-count a session the reader left open.
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const since = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0;
      setElapsed(Math.floor(accumulatedRef.current + since));
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [running]);

  // Seed the start page from the reader's current progress, once the book lands.
  if (book && !seeded) {
    setSeeded(true);
    setStartPage(String(book.progressPage ?? 0));
  }

  if (isLoading || error || !book) {
    return (
      <>
        <AppHeader back title={t('session.title')} />
        <Screen>
          <QueryState
            isLoading={isLoading}
            error={error}
            skeleton={[200, 160]}
            onRetry={() => void refetch()}
          />
        </Screen>
      </>
    );
  }

  const start = () => {
    tap();
    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const pause = () => {
    tap();
    if (startedAtRef.current) {
      accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    }
    startedAtRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    tap();
    startedAtRef.current = null;
    accumulatedRef.current = 0;
    setElapsed(0);
    setRunning(false);
  };

  const stop = () => {
    if (running) pause();
    // Nothing to confirm until the reader says where they got to.
    if (!endPage) setEndPage(startPage);
  };

  const parsedStart = Math.max(0, Math.min(book.pageCount, Number(startPage) || 0));
  const parsedEnd = Math.max(0, Math.min(book.pageCount, Number(endPage) || 0));
  const pagesRead = Math.max(0, parsedEnd - parsedStart);
  const canSave = elapsed > 0 && parsedEnd >= parsedStart;

  const save = async () => {
    try {
      await log.mutateAsync({
        bookId: book.id,
        startPage: parsedStart,
        endPage: parsedEnd,
        durationSeconds: elapsed,
        note: note.trim() || undefined,
      });
      successHaptic();
      toast.success(t('session.saved', { pages: pagesRead }));
      router.back();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const pagesPerHour = elapsed > 0 ? Math.round((pagesRead / elapsed) * 3600) : 0;

  return (
    <>
      <AppHeader back title={t('session.title')} />

      <Screen contentStyle={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
          <BookCover
            title={book.title}
            authorName={book.authorName}
            uri={book.coverUrl}
            width={56}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {book.title}
            </Text>
            <Text variant="small" color="fgMuted" numberOfLines={1}>
              {book.authorName}
            </Text>
            <Progress
              value={readingPercent(parsedEnd || parsedStart, book.pageCount)}
              height={5}
            />
          </View>
        </View>

        {/* The clock */}
        <Card style={{ alignItems: 'center', gap: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: 52,
              lineHeight: 60,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              color: running ? theme.colors.primary : theme.colors.fg,
            }}
          >
            {formatClock(elapsed)}
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {running ? (
              <Button
                title={t('session.pause')}
                variant="secondary"
                fullWidth={false}
                style={{ minWidth: 130 }}
                icon={<Pause size={16} color={theme.colors.primary} />}
                onPress={pause}
              />
            ) : (
              <Button
                title={elapsed > 0 ? t('session.resume') : t('session.start')}
                fullWidth={false}
                style={{ minWidth: 130 }}
                icon={<Play size={16} color={theme.colors.primaryFg} />}
                onPress={start}
              />
            )}

            {elapsed > 0 ? (
              <>
                <Button
                  title={t('session.stop')}
                  variant="outline"
                  fullWidth={false}
                  icon={<Square size={16} color={theme.colors.fg} />}
                  onPress={stop}
                />
                <Button
                  title={t('session.reset')}
                  variant="ghost"
                  fullWidth={false}
                  icon={<RotateCcw size={16} color={theme.colors.primary} />}
                  onPress={reset}
                />
              </>
            ) : null}
          </View>

          {elapsed > 0 && pagesRead > 0 ? (
            <Text variant="small" color="fgMuted">
              {t('session.speed', { value: pagesPerHour })}
            </Text>
          ) : null}
        </Card>

        <Section title={t('session.pagesTitle')}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Input
              label={t('session.startPage')}
              value={startPage}
              onChangeText={setStartPage}
              keyboardType="number-pad"
              inputMode="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label={t('session.endPage')}
              value={endPage}
              onChangeText={setEndPage}
              keyboardType="number-pad"
              inputMode="numeric"
              hint={`${t('common.of')} ${book.pageCount}`}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {[5, 10, 20, 30].map((delta) => (
              <Button
                key={delta}
                title={`+${delta}`}
                variant="outline"
                size="sm"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() =>
                  setEndPage(
                    String(Math.min(book.pageCount, (Number(endPage) || parsedStart) + delta)),
                  )
                }
              />
            ))}
          </View>

          <Input
            label={t('session.note')}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t('session.notePlaceholder')}
          />

          <Button
            title={t('session.save')}
            disabled={!canSave}
            loading={log.isPending}
            onPress={save}
          />
          {!canSave && elapsed === 0 ? (
            <Text variant="small" color="fgSubtle" center>
              {t('session.startHint')}
            </Text>
          ) : null}
        </Section>

        {sessions && sessions.length > 0 ? (
          <Section title={t('session.history')}>
            <View style={{ gap: theme.spacing.sm }}>
              {sessions.slice(0, 8).map((s) => (
                <Card key={s.id} level={0} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="smallStrong">
                      {t('session.pagesRange', { from: s.startPage, to: s.endPage })}
                    </Text>
                    <Text variant="caption" color="fgSubtle">
                      {formatRelative(s.startedAt, locale)} ·{' '}
                      {t('session.minutes', { count: Math.round(s.durationSeconds / 60) })}
                    </Text>
                    {s.note ? (
                      <Text variant="small" color="fgMuted" numberOfLines={2}>
                        {s.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="bodyStrong" color="primary">
                    +{Math.max(0, s.endPage - s.startPage)}
                  </Text>
                </Card>
              ))}
            </View>
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
