import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flag, Send } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import {
  useAddComment,
  useBook,
  useComments,
  useQuote,
  useReportContent,
  useToggleQuoteLike,
} from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { BookListItem } from '@/components/book/BookListItem';
import { QuoteCard } from '@/components/quote/QuoteCard';
import { ReportSheet } from '@/components/review/ReportSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function QuoteDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: quote, isLoading } = useQuote(id);
  const { data: comments } = useComments('quote', id);
  const { data: book } = useBook(quote?.bookId);
  const toggleLike = useToggleQuoteLike();
  const addComment = useAddComment('quote');
  const report = useReportContent();

  const [draft, setDraft] = useState('');
  const [reporting, setReporting] = useState(false);

  const send = async () => {
    if (!draft.trim() || !id) return;
    try {
      await addComment.mutateAsync({ id, body: draft.trim() });
      setDraft('');
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={t('nav.quotes')}
        right={
          quote ? (
            <IconButton label={t('common.report')} onPress={() => setReporting(true)}>
              <Flag size={18} color={theme.colors.fgSubtle} />
            </IconButton>
          ) : undefined
        }
      />

      <Screen keyboardAware bottomInset={72}>
        {isLoading || !quote ? (
          <Skeleton height={220} radius={theme.radius.lg} />
        ) : (
          <>
            <QuoteCard
              quote={quote}
              onLike={(liked) => toggleLike.mutate({ id: quote.id, liked })}
            />

            {book ? (
              <Section title={t('quote.fromBook', { title: book.title })}>
                <BookListItem book={book} />
              </Section>
            ) : null}

            <Section title={t('quote.comments', { count: comments?.length ?? 0 })}>
              {!comments || comments.length === 0 ? (
                <Text variant="small" color="fgSubtle">
                  {t('quote.addComment')}
                </Text>
              ) : (
                <View style={{ gap: theme.spacing.md }}>
                  {comments.map((comment) => (
                    <View
                      key={comment.id}
                      style={{ flexDirection: 'row', gap: theme.spacing.md }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={comment.user.name}
                        onPress={() => router.push(`/user/${comment.user.username}`)}
                      >
                        <Avatar name={comment.user.name} uri={comment.user.avatarUrl} size={34} />
                      </Pressable>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                          <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {comment.user.name}
                          </Text>
                          <Text variant="caption" color="fgSubtle">
                            {formatRelative(comment.createdAt, locale)}
                          </Text>
                        </View>
                        <Text variant="small" color="fgMuted">
                          {comment.body}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Section>
          </>
        )}
      </Screen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <Input
          containerStyle={{ flex: 1 }}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('quote.addComment')}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <IconButton
          label={t('quote.addComment')}
          variant="subtle"
          size={46}
          disabled={!draft.trim() || addComment.isPending}
          onPress={send}
        >
          <Send size={18} color={theme.colors.primary} />
        </IconButton>
      </View>

      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        onSubmit={async (reason, note) => {
          if (!quote) return;
          await report.mutateAsync({
            targetType: 'quote',
            targetId: quote.id,
            reason,
            note,
            snapshotText: quote.text,
            snapshotAuthor: quote.user.name,
            snapshotBook: quote.book.title,
          });
          toast.success(t('common.report'));
          setReporting(false);
        }}
      />
    </>
  );
}
