import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, Send } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import {
  useBuddyMessages,
  useBuddyRead,
  useJoinBuddyRead,
  useLeaveBuddyRead,
  useSendBuddyMessage,
  useUpdateBuddyProgress,
} from '@/api/hooks';
import { formatRelative } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { QueryState } from '@/components/ui/QueryState';
import { Screen, Section } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function BuddyReadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const me = useCurrentUser();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: buddy, isLoading, error, refetch } = useBuddyRead(id);
  // Derived before the messages query, which needs it: the discussion is
  // members-only, so asking as a non-member is a guaranteed 403.
  const isMember = buddy?.members.some((m) => m.user.id === me?.id) ?? false;
  const { data: messages } = useBuddyMessages(id, isMember);
  const send = useSendBuddyMessage();
  const join = useJoinBuddyRead();
  const leave = useLeaveBuddyRead();
  const updateProgress = useUpdateBuddyProgress();

  const [draft, setDraft] = useState('');
  const [progressOpen, setProgressOpen] = useState(false);
  const [page, setPage] = useState('');

  const myProgress = buddy?.members.find((m) => m.user.id === me?.id)?.progressPage ?? 0;

  const submitMessage = async () => {
    if (!draft.trim() || !id) return;
    try {
      await send.mutateAsync({ id, body: draft.trim() });
      setDraft('');
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const saveProgress = async () => {
    if (!id) return;
    await updateProgress.mutateAsync({ id, page: Math.max(0, Number(page) || 0) });
    setProgressOpen(false);
    toast.success(t('book.progressSaved'));
  };

  if (isLoading || error || !buddy) {
    return (
      <>
        <AppHeader back />
        <Screen>
          <QueryState
            isLoading={isLoading}
            error={error}
            skeleton={[140, 200]}
            onRetry={() => void refetch()}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppHeader back title={buddy.name} subtitle={buddy.book.title} />

      <Screen keyboardAware bottomInset={isMember ? 76 : 0}>
        <Card level={0} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <BookCover title={buddy.book.title} uri={buddy.book.coverUrl} width={62} />
          <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: 'center' }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {buddy.book.title}
            </Text>
            <Text variant="small" color="fgMuted" numberOfLines={1}>
              {buddy.book.authorName}
            </Text>
            {isMember ? (
              <>
                <Progress
                  value={(myProgress / Math.max(1, buddy.book.pageCount)) * 100}
                  height={6}
                />
                <Text variant="caption" color="fgSubtle">
                  {myProgress}/{buddy.book.pageCount}
                </Text>
              </>
            ) : null}
          </View>
        </Card>

        {isMember ? (
          <Button
            title={t('book.updateProgress')}
            variant="secondary"
            onPress={() => {
              setPage(String(myProgress));
              setProgressOpen(true);
            }}
          />
        ) : (
          <Button
            title={t('buddy.join')}
            loading={join.isPending}
            onPress={() => join.mutate(buddy.id)}
          />
        )}

        {/* Everyone's progress side by side — the point of a buddy read. */}
        <Section title={t('buddy.progress')}>
          <Card level={0} style={{ gap: theme.spacing.lg }}>
            {buddy.members.map((member) => {
              const percent = (member.progressPage / Math.max(1, buddy.book.pageCount)) * 100;
              return (
                <View
                  key={member.user.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
                >
                  <Avatar name={member.user.name} uri={member.user.avatarUrl} size={34} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {member.user.id === me?.id ? t('game.you') : member.user.name}
                      </Text>
                      <Text variant="caption" color="fgSubtle">
                        {Math.round(percent)}%
                      </Text>
                    </View>
                    <Progress value={percent} height={5} />
                  </View>
                </View>
              );
            })}
          </Card>
        </Section>

        <Section title={t('buddy.discussion')}>
          {/* The API refuses the discussion to non-members — it is spoiler
              territory — so the section says why rather than rendering an
              unexplained empty heading. */}
          {!isMember ? (
            <EmptyState
              compact
              icon={<Lock size={22} color={theme.colors.fgSubtle} />}
              title={t('buddy.discussionLocked')}
              hint={t('buddy.discussionLockedHint')}
            />
          ) : null}

          <View style={{ gap: theme.spacing.md }}>
            {(messages ?? []).map((message) => {
              const mine = message.user.id === me?.id;
              return (
                <View
                  key={message.id}
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!mine ? (
                    <Avatar name={message.user.name} uri={message.user.avatarUrl} size={30} />
                  ) : null}
                  <View
                    style={{
                      maxWidth: '78%',
                      gap: 3,
                      padding: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      backgroundColor: mine ? theme.colors.primarySoft : theme.colors.card,
                      borderWidth: 1,
                      borderColor: mine ? 'transparent' : theme.colors.border,
                    }}
                  >
                    {!mine ? (
                      <Text variant="caption" color="primary">
                        {message.user.name}
                        {message.chapter ? ` · ${message.chapter}` : ''}
                      </Text>
                    ) : null}
                    <Text variant="small">{message.body}</Text>
                    <Text variant="caption" color="fgSubtle">
                      {formatRelative(message.createdAt, locale)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>

        {isMember ? (
          <Button
            title={t('buddy.leave')}
            variant="ghost"
            loading={leave.isPending}
            onPress={async () => {
              await leave.mutateAsync(buddy.id);
              router.back();
            }}
          />
        ) : null}
      </Screen>

      {isMember ? (
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
            placeholder={t('buddy.writeMessage')}
            onSubmitEditing={submitMessage}
            returnKeyType="send"
          />
          <IconButton
            label={t('buddy.writeMessage')}
            variant="subtle"
            size={46}
            disabled={!draft.trim() || send.isPending}
            onPress={submitMessage}
          >
            <Send size={18} color={theme.colors.primary} />
          </IconButton>
        </View>
      ) : null}

      <Sheet
        visible={progressOpen}
        onClose={() => setProgressOpen(false)}
        title={t('book.updateProgress')}
      >
        <Input
          label={t('book.currentPage')}
          value={page}
          onChangeText={setPage}
          keyboardType="number-pad"
          inputMode="numeric"
          hint={`${t('common.of')} ${buddy.book.pageCount}`}
        />
        <Button title={t('common.save')} loading={updateProgress.isPending} onPress={saveProgress} />
      </Sheet>
    </>
  );
}
