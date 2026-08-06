import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FolderPlus, Library, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBuddyReads, useCreateShelf, useShelves } from '@/api/hooks';
import { useRefresh } from '@/lib/hooks';
import { BookCover } from '@/components/book/BookCover';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen, Section } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Shelf } from '@/types';

/** Library tab: default shelves, custom shelves and buddy reads. */
export default function ShelvesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const { data: shelves, isLoading, refetch } = useShelves();
  const { data: buddyReads } = useBuddyReads();
  const createShelf = useCreateShelf();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const defaults = shelves?.filter((s) => s.isDefault) ?? [];
  const custom = shelves?.filter((s) => !s.isDefault) ?? [];

  const submit = async () => {
    if (name.trim().length < 2) return;
    try {
      await createShelf.mutateAsync(name.trim());
      toast.success(t('shelf.created'));
      setName('');
      setCreating(false);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <>
      <AppHeader title={t('shelf.myShelves')} actions />

      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={82} radius={theme.radius.lg} />
            ))}
          </View>
        ) : (
          <Section title={t('shelf.myShelves')}>
            <View style={{ gap: theme.spacing.md }}>
              {defaults.map((shelf) => (
                <ShelfRow key={shelf.id} shelf={shelf} />
              ))}
            </View>
          </Section>
        )}

        <Section
          title={t('shelf.customShelves')}
          action={
            <Pressable accessibilityRole="button" onPress={() => setCreating(true)}>
              <Text variant="smallStrong" color="primary">
                {t('shelf.createShelf')}
              </Text>
            </Pressable>
          }
        >
          {custom.length === 0 ? (
            <EmptyState
              compact
              icon={<FolderPlus size={20} color={theme.colors.fgSubtle} />}
              title={t('shelf.createShelf')}
              hint={t('shelf.shelfNamePlaceholder')}
              actionLabel={t('shelf.createShelf')}
              onAction={() => setCreating(true)}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {custom.map((shelf) => (
                <ShelfRow key={shelf.id} shelf={shelf} />
              ))}
            </View>
          )}
        </Section>

        <Section
          title={t('buddy.title')}
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/buddy-reads')}>
              <Text variant="smallStrong" color="primary">
                {t('common.seeAll')}
              </Text>
            </Pressable>
          }
        >
          {!buddyReads || buddyReads.length === 0 ? (
            <EmptyState
              compact
              icon={<Users size={20} color={theme.colors.fgSubtle} />}
              title={t('buddy.empty')}
              hint={t('buddy.emptyHint')}
              actionLabel={t('buddy.create')}
              onAction={() => router.push('/buddy-reads')}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {buddyReads.slice(0, 3).map((buddy) => (
                <Card
                  key={buddy.id}
                  level={0}
                  onPress={() => router.push(`/buddy-reads/${buddy.id}`)}
                  style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}
                >
                  <BookCover title={buddy.book.title} uri={buddy.book.coverUrl} width={42} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {buddy.name}
                    </Text>
                    <Text variant="small" color="fgMuted" numberOfLines={1}>
                      {buddy.book.title}
                    </Text>
                    <Text variant="caption" color="fgSubtle">
                      {buddy.members.length} · {t('buddy.members')}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Section>
      </Screen>

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('shelf.createShelf')}>
        <Input
          label={t('shelf.shelfName')}
          value={name}
          onChangeText={setName}
          placeholder={t('shelf.shelfNamePlaceholder')}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Button
          title={t('common.save')}
          loading={createShelf.isPending}
          disabled={name.trim().length < 2}
          onPress={submit}
        />
      </Sheet>
    </>
  );
}

function ShelfRow({ shelf }: { shelf: Shelf }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const label = shelf.status
    ? t(`shelf.${shelf.status === 'want_to_read' ? 'wantToRead' : shelf.status}`)
    : shelf.name;

  return (
    <Card
      level={0}
      onPress={() => router.push(`/shelf/${shelf.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
      {/* Fanned cover stack; falls back to a neutral tile for empty shelves. */}
      <View style={{ width: 62, height: 54, justifyContent: 'center' }}>
        {shelf.booksCount === 0 ? (
          <View
            style={{
              width: 38,
              height: 52,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.subtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Library size={18} color={theme.colors.fgSubtle} />
          </View>
        ) : (
          [0, 1, 2].slice(0, Math.min(3, shelf.booksCount)).map((i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: i * 11,
                width: 34,
                height: 50,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.chart[i % theme.colors.chart.length],
                opacity: 1 - i * 0.18,
                borderWidth: 1.5,
                borderColor: theme.colors.card,
              }}
            />
          ))
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="small" color="fgSubtle">
          {t('shelf.booksCount', { count: shelf.booksCount })}
        </Text>
      </View>
    </Card>
  );
}
