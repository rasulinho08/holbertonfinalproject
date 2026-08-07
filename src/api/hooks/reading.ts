import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { DEFAULT_PAGE_SIZE } from '../config';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type {
  BookList,
  BookListDetail,
  Paginated,
  ReadingSession,
  ReadingSessionDraft,
  ReadingStats,
} from '@/types';

/* ---------------------------- reading sessions ---------------------------- */

export function useReadingSessions() {
  return useQuery({
    queryKey: qk.sessions.list,
    queryFn: () => api.get<Paginated<ReadingSession>>(Endpoints.sessions.list, { limit: 50 }),
    select: (page) => page.data,
  });
}

export function useBookSessions(bookId: string | undefined) {
  return useQuery({
    queryKey: qk.sessions.forBook(bookId ?? ''),
    queryFn: () =>
      api.get<Paginated<ReadingSession>>(Endpoints.sessions.forBook(bookId!), { limit: 30 }),
    enabled: !!bookId,
    select: (page) => page.data,
  });
}

export function useReadingStats(days = 30) {
  return useQuery({
    queryKey: [...qk.sessions.stats, days],
    queryFn: () => api.get<ReadingStats>(Endpoints.sessions.stats, { days }),
  });
}

/**
 * Logging a session moves the reader's progress, which in turn can complete a
 * book, extend the streak and earn a badge — so it invalidates rather more than
 * its own key.
 */
function sessionInvalidation(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: qk.sessions.all }),
    client.invalidateQueries({ queryKey: qk.shelves.all }),
    client.invalidateQueries({ queryKey: qk.books.all }),
    client.invalidateQueries({ queryKey: qk.users.all }),
    client.invalidateQueries({ queryKey: qk.auth.me }),
    client.invalidateQueries({ queryKey: qk.streak }),
    client.invalidateQueries({ queryKey: qk.badges }),
  ]);
}

export function useLogReadingSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: ReadingSessionDraft) =>
      api.post<ReadingSession>(Endpoints.sessions.create, draft),
    onSuccess: () => sessionInvalidation(client),
  });
}

export function useDeleteReadingSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(Endpoints.sessions.remove(id)),
    onSuccess: () => sessionInvalidation(client),
  });
}

/* -------------------------------- book lists ------------------------------ */

export type ListScope = 'all' | 'mine' | 'following';

export function useBookLists(scope: ListScope = 'all', search?: string) {
  return useInfiniteQuery({
    queryKey: qk.lists.list({ scope, search }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<BookList>>(Endpoints.lists.list, {
        scope: scope === 'all' ? undefined : scope,
        q: search || undefined,
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

export function useBookList(id: string | undefined) {
  return useQuery({
    queryKey: qk.lists.detail(id ?? ''),
    queryFn: () => api.get<BookListDetail>(Endpoints.lists.detail(id!)),
    enabled: !!id,
  });
}

/** Lists a given book appears on — shown as a rail on the book detail screen. */
export function useListsForBook(bookId: string | undefined) {
  return useQuery({
    queryKey: qk.lists.forBook(bookId ?? ''),
    queryFn: () => api.get<Paginated<BookList>>(Endpoints.lists.forBook(bookId!), { limit: 10 }),
    enabled: !!bookId,
    select: (page) => page.data,
  });
}

export function useCreateBookList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post<BookList>(Endpoints.lists.create, body),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.lists.all }),
  });
}

export function useDeleteBookList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(Endpoints.lists.remove(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.lists.all }),
  });
}

export function useToggleListFollow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, follow }: { id: string; follow: boolean }) =>
      api.post<{ following: boolean; followersCount: number }>(Endpoints.lists.follow(id), {
        follow,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.lists.all }),
  });
}

export function useAddBookToList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, bookId, note }: { listId: string; bookId: string; note?: string }) =>
      api.post<BookList>(Endpoints.lists.addBook(listId), { bookId, note }),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.lists.all }),
  });
}

export function useRemoveBookFromList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, bookId }: { listId: string; bookId: string }) =>
      api.delete<BookList>(Endpoints.lists.removeBook(listId, bookId)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.lists.all }),
  });
}
