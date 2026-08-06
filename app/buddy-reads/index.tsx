import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useBooks, useBuddyReads, useCreateBuddyRead, useShelfBooks, useShelves } from '@/api/hooks';
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

  const { data: shelves } = useShelves();
  const readingShelfId = shelves?.find((s) => s.status === 'reading')?.id;
  const { data: readingEntries } = useShelfBooks(readingShelfId);

  const [creating, setCreating] = useState(!!params.bookId);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [pickedBook, setPickedBook] = useState<Book | null>(null);

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
      const created = await create.mutateAsync({ name: name.trim(), bookId: book.id });
      toast.success(t('buddy.created'));
      setCreating(false);
      setName('');
      router.push(`/buddy-reads/${created.id}`);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={t('buddy.title')}
        right={
          <IconButton label={t('buddy.create')} variant="subtle" onPress={() => setCreating(true)}>
            <Plus size={20} color={theme.colors.primary} />
          </IconButton>
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
            <EmptyState
              icon={<Users size={22} color={theme.colors.fgSubtle} />}
              title={t('buddy.empty')}
              hint={t('buddy.emptyHint')}
              actionLabel={t('buddy.create')}
              onAction={() => setCreating(true)}
            />
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
