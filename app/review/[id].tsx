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
  useReportContent,
  useReview,
  useToggleReviewLike,
} from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { BookListItem } from '@/components/book/BookListItem';
import { ReportSheet } from '@/components/review/ReportSheet';
import { ReviewCard } from '@/components/review/ReviewCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

/**
 * A review with its comment thread.
 *
 * Reviews have carried a comment count and a comment button since the start,
 * and the API has served `/reviews/:id/comments` all along — but there was
 * nowhere for the button to lead, so tapping it did nothing and the count could
 * only ever be zero. This is the quote detail screen's structure applied to a
 * review, so the two threads behave the same way.
 */
export default function ReviewDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: review, isLoading } = useReview(id);
  const { data: comments } = useComments('review', id);
  const { data: book } = useBook(review?.bookId);
  const toggleLike = useToggleReviewLike();
  const addComment = useAddComment('review');
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
        title={t('book.reviews')}
        right={
          review ? (
            <IconButton label={t('common.report')} onPress={() => setReporting(true)}>
              <Flag size={18} color={theme.colors.fgSubtle} />
            </IconButton>
          ) : undefined
        }
      />

      <Screen keyboardAware bottomInset={72}>
        {isLoading || !review ? (
          <Skeleton height={180} radius={theme.radius.lg} />
        ) : (
          <>
            <ReviewCard
              review={review}
              onLike={(liked) => toggleLike.mutate({ id: review.id, liked })}
            />

            {book ? (
              <Section title={t('quote.fromBook', { title: book.title })}>
                <BookListItem book={book} />
              </Section>
            ) : null}

            <Section title={t('review.comments', { count: comments?.length ?? 0 })}>
              {!comments || comments.length === 0 ? (
                <Text variant="small" color="fgSubtle">
                  {t('review.addComment')}
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
          placeholder={t('review.addComment')}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <IconButton
          label={t('review.addComment')}
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
          if (!review) return;
          await report.mutateAsync({
            targetType: 'review',
            targetId: review.id,
            reason,
            note,
            snapshotText: review.body,
            snapshotAuthor: review.user.name,
            snapshotBook: review.book?.title ?? book?.title ?? '',
          });
          toast.success(t('common.report'));
          setReporting(false);
        }}
      />
    </>
  );
}
