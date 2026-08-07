import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListPlus, Rows3 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useBookLists, useCreateBookList, type ListScope } from '@/api/hooks';
import { BookListCard } from '@/components/book/BookListCard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export default function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const [scope, setScope] = useState<ListScope>('all');
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const query = useBookLists(scope);
  const create = useCreateBookList();

  const lists = query.data?.pages.flatMap((p) => p.data) ?? [];

  const submit = async () => {
    try {
      const list = await create.mutateAsync({ title: title.trim(), description: description.trim() });
      setComposing(false);
      setTitle('');
      setDescription('');
      toast.success(t('list.created'));
      router.push({ pathname: '/list/[id]', params: { id: list.id } });
    } catch {
      toast.error(t('list.titleTooShort'));
    }
  };

  return (
    <>
      <AppHeader
        back
        title={t('list.title')}
        right={
          <IconButton label={t('list.create')} onPress={() => setComposing(true)}>
            <ListPlus size={18} color={theme.colors.fg} />
          </IconButton>
        }
      />

      <FlatList
        data={lists}
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
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListHeaderComponent={
          <SegmentedControl
            value={scope}
            onChange={setScope}
            style={{ marginBottom: theme.spacing.sm }}
            options={[
              { value: 'all', label: t('list.scopeAll') },
              { value: 'mine', label: t('list.scopeMine') },
              { value: 'following', label: t('list.scopeFollowing') },
            ]}
          />
        }
        renderItem={({ item, index }) => <BookListCard list={item} index={index % 12} />}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={{ gap: theme.spacing.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={104} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Rows3 size={22} color={theme.colors.fgSubtle} />}
              title={t('list.empty')}
              hint={t('list.emptyHint')}
              actionLabel={t('list.create')}
              onAction={() => setComposing(true)}
            />
          )
        }
      />

      <Sheet visible={composing} onClose={() => setComposing(false)} title={t('list.create')}>
        <Input label={t('list.name')} value={title} onChangeText={setTitle} autoFocus />
        <Input
          label={t('list.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t('list.descriptionPlaceholder')}
        />
        <Text variant="small" color="fgSubtle">
          {t('list.createHint')}
        </Text>
        <Button
          title={t('common.save')}
          disabled={title.trim().length < 3}
          loading={create.isPending}
          onPress={submit}
        />
      </Sheet>
    </>
  );
}
