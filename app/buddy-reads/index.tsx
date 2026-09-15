import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyRound, Lock, Plus, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import {
  useBooks,
  useBuddyReads,
  useCreateBuddyRead,
  useJoinBuddyReadByCode,
  useShelfBooks,
  useShelves,
} from '@/api/hooks';
import { useDebounced } from '@/lib/hooks';
import { formatDate } from '@/lib/format';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Book, BuddyRead } from '@/types';

export default function BuddyReadsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const params = useLocalSearchParams<{ bookId?: string }>();

  const { data: buddyReads, isLoading } = useBuddyReads();
  const create = useCreateBuddyRead();
  const joinByCode = useJoinBuddyReadByCode();

  const { data: shelves } = useShelves();
  const readingShelfId = shelves?.find((s) => s.status === 'reading')?.id;
  const { data: readingEntries } = useShelfBooks(readingShelfId);

  const [creating, setCreating] = useState(!!params.bookId);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [search, setSearch] = useState('');
  const [pickedBook, setPickedBook] = useState<Book | null>(null);

  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const searchQuery = useBooks({ q: debouncedSearch || undefined });
  const options = useMemo(() => {
    if (search) return searchQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return (readingEntries ?? []).map((e) => e.book);
  }, [search, searchQuery.data, readingEntries]);

  // Arriving from a book detail page pre-selects that book — derived, not synced.
  const book = pickedBook ?? options.find((b) => b.id === params.bookId) ?? null;

  const submit = async () => {
    if (!book || name.trim().length < 2) return;
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        bookId: book.id,
        isPrivate,
      });
      toast.success(t('buddy.created'));
      setCreating(false);
      setName('');
      setIsPrivate(false);
      router.push(`/buddy-reads/${created.id}`);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const submitCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setCodeError(t('buddy.codeRequired'));
      return;
    }
    setCodeError(null);
    try {
      const joined = await joinByCode.mutateAsync(trimmed);
      toast.success(t('buddy.joinedByCode'));
      setJoining(false);
      setCode('');
      router.push(`/buddy-reads/${joined.id}`);
    } catch {
      // The API answers 404 both for a code nobody owns and for a private
      // group the reader may not see. That is deliberate, so the screen shows
      // one message rather than guessing which case it was.
      setCodeError(t('buddy.codeNotFound'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={t('buddy.title')}
        right={
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <IconButton
              label={t('buddy.joinByCode')}
              variant="subtle"
              onPress={() => setJoining(true)}
            >
              <KeyRound size={20} color={theme.colors.primary} />
            </IconButton>
            <IconButton label={t('buddy.create')} variant="subtle" onPress={() => setCreating(true)}>
              <Plus size={20} color={theme.colors.primary} />
            </IconButton>
          </View>
        }
      />

      <FlatList
        data={buddyReads}
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
        renderItem={({ item }) => <BuddyCard buddy={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={130} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              <EmptyState
                icon={<Users size={22} color={theme.colors.fgSubtle} />}
                title={t('buddy.empty')}
                hint={t('buddy.emptyHint')}
                actionLabel={t('buddy.create')}
                onAction={() => setCreating(true)}
              />
              {/* A reader whose friend already made the group arrives here with
                  a code and nothing to do with it. */}
              <Button
                title={t('buddy.joinByCode')}
                variant="secondary"
                icon={<KeyRound size={16} color={theme.colors.primary} />}
                onPress={() => setJoining(true)}
              />
            </View>
          )
        }
      />

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('buddy.create')} scrollable={false}>
        <Input
          label={t('buddy.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('buddy.title')}
        />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isPrivate }}
          accessibilityLabel={`${t('buddy.private')}. ${t('buddy.privateHint')}`}
          onPress={() => setIsPrivate((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            borderWidth: 1.5,
            borderColor: isPrivate ? theme.colors.primary : theme.colors.border,
            backgroundColor: isPrivate ? theme.colors.primarySoft : 'transparent',
          }}
        >
          <Lock size={18} color={isPrivate ? theme.colors.primary : theme.colors.fgSubtle} />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text variant="bodyStrong">{t('buddy.private')}</Text>
            <Text variant="small" color="fgMuted">
              {t('buddy.privateHint')}
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: theme.radius.pill,
              padding: 3,
              justifyContent: 'center',
              alignItems: isPrivate ? 'flex-end' : 'flex-start',
              backgroundColor: isPrivate ? theme.colors.primary : theme.colors.borderStrong,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: theme.colors.card,
              }}
            />
          </View>
        </Pressable>

        <Text variant="caption" color="fgSubtle">
          {t('buddy.selectBook').toUpperCase()}
        </Text>
        <Input value={search} onChangeText={setSearch} placeholder={t('explore.searchPlaceholder')} />

        <FlatList
          data={options.slice(0, 20)}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 230 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.sm }}
          renderItem={({ item }) => {
            const selected = book?.id === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.title}
                onPress={() => setPickedBook(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : 'transparent',
                  backgroundColor: selected ? theme.colors.primarySoft : 'transparent',
                }}
              >
                <BookCover title={item.title} uri={item.coverUrl} width={32} />
                <Text variant="small" style={{ flex: 1 }} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
            );
          }}
        />

        <Button
          title={t('buddy.create')}
          loading={create.isPending}
          disabled={!book || name.trim().length < 2}
          onPress={submit}
        />
      </Sheet>

      <Sheet
        visible={joining}
        onClose={() => {
          setJoining(false);
          setCodeError(null);
        }}
        title={t('buddy.joinByCode')}
        scrollable={false}
      >
        <Input
          label={t('buddy.inviteCode')}
          hint={t('buddy.joinByCodeHint')}
          value={code}
          // Uppercased as the reader types, because that is how the code is
          // shown everywhere else — a lowercase echo looks like a different code.
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            if (codeError) setCodeError(null);
          }}
          error={codeError ?? undefined}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          placeholder={t('buddy.joinByCodePlaceholder')}
          icon={<KeyRound size={18} color={theme.colors.fgSubtle} />}
          onSubmitEditing={submitCode}
          returnKeyType="go"
        />

        <Button
          title={t('buddy.join')}
          loading={joinByCode.isPending}
          disabled={code.trim().length === 0}
          onPress={submitCode}
        />
      </Sheet>
    </>
  );
}

function BuddyCard({ buddy }: { buddy: BuddyRead }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, locale } = useI18n();
  const me = useCurrentUser();

  const isMember = buddy.members.some((m) => m.user.id === me?.id);
  const avgProgress =
    buddy.members.reduce((sum, m) => sum + m.progressPage, 0) /
    Math.max(1, buddy.members.length);
  const percent = Math.min(100, (avgProgress / Math.max(1, buddy.book.pageCount)) * 100);

  return (
    <Card level={0} onPress={() => router.push(`/buddy-reads/${buddy.id}`)} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <BookCover title={buddy.book.title} uri={buddy.book.coverUrl} width={54} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {buddy.name}
            </Text>
            {buddy.isPrivate ? <Badge label={t('buddy.privateBadge')} tone="warning" /> : null}
            {isMember ? <Badge label={t('buddy.members')} tone="primary" /> : null}
          </View>
          <Text variant="small" color="fgMuted" numberOfLines={1}>
            {buddy.book.title}
          </Text>
          {buddy.targetDate ? (
            <Text variant="caption" color="fgSubtle">
              {t('buddy.targetDate')}: {formatDate(buddy.targetDate, locale)}
            </Text>
          ) : null}
        </View>
      </View>

      <Progress value={percent} height={6} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row' }}>
          {buddy.members.slice(0, 4).map((member, i) => (
            <View key={member.user.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
              <Avatar name={member.user.name} uri={member.user.avatarUrl} size={26} />
            </View>
          ))}
        </View>
        <Text variant="caption" color="fgSubtle" style={{ flex: 1 }}>
          {buddy.members.length} · {t('buddy.members')}
        </Text>
        <Text variant="caption" color="fgSubtle">
          {buddy.messagesCount} · {t('buddy.discussion')}
        </Text>
      </View>
    </Card>
  );
}
