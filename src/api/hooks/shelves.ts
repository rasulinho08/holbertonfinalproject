import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type { Book, Paginated, Shelf, ShelfEntry, ShelfStatus } from '@/types';

export function useShelves() {
  return useQuery({
    queryKey: qk.shelves.mine,
    queryFn: () => api.get<Shelf[]>(Endpoints.shelves.mine),
  });
}

export function useShelfBooks(shelfId: string | undefined) {
  return useQuery({
    queryKey: qk.shelves.books(shelfId ?? ''),
    queryFn: () => api.get<Paginated<ShelfEntry>>(Endpoints.shelves.books(shelfId!), { limit: 100 }),
    enabled: !!shelfId,
    select: (page) => page.data,
  });
}

/**
 * Invalidating this set after any shelf change keeps the profile stats, the
 * home screen and every book card consistent without manual cache surgery.
 */
function shelfInvalidation(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: qk.shelves.all }),
    client.invalidateQueries({ queryKey: qk.books.all }),
    client.invalidateQueries({ queryKey: qk.users.all }),
    client.invalidateQueries({ queryKey: qk.auth.me }),
    client.invalidateQueries({ queryKey: qk.badges }),
    client.invalidateQueries({ queryKey: qk.streak }),
  ]);
}

export interface SetShelfInput {
  bookId: string;
  status: ShelfStatus;
  shelfId?: string;
  progressPage?: number;
}

export function useSetBookShelf() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, ...body }: SetShelfInput) =>
      api.put<Book>(Endpoints.shelves.setForBook(bookId), body),
    onSuccess: (book) => {
      // Seed the detail cache so the book screen updates before the refetch.
      client.setQueryData(qk.books.detail(book.id), book);
      return shelfInvalidation(client);
    },
  });
}

export function useRemoveFromShelf() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => api.delete<Book>(Endpoints.shelves.removeForBook(bookId)),
    onSuccess: (book) => {
      client.setQueryData(qk.books.detail(book.id), book);
      return shelfInvalidation(client);
    },
  });
}

export function useUpdateProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, page }: { bookId: string; page: number }) =>
      api.patch<Book>(Endpoints.shelves.progress(bookId), { page }),
    onMutate: async ({ bookId, page }) => {
      // Optimistic: the progress bar should move the instant the user confirms.
      await client.cancelQueries({ queryKey: qk.books.detail(bookId) });
      const previous = client.getQueryData<Book>(qk.books.detail(bookId));
      if (previous) {
        client.setQueryData<Book>(qk.books.detail(bookId), { ...previous, progressPage: page });
      }
      return { previous };
    },
    onError: (_err, { bookId }, context) => {
      if (context?.previous) client.setQueryData(qk.books.detail(bookId), context.previous);
    },
    onSuccess: (book) => {
      client.setQueryData(qk.books.detail(book.id), book);
      return shelfInvalidation(client);
    },
  });
}

export function useCreateShelf() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Shelf[]>(Endpoints.shelves.create, { name }),
    onSuccess: (shelves) => client.setQueryData(qk.shelves.mine, shelves),
  });
}

export function useRenameShelf() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Shelf[]>(Endpoints.shelves.update(id), { name }),
    onSuccess: (shelves) => client.setQueryData(qk.shelves.mine, shelves),
  });
}

export function useDeleteShelf() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Shelf[]>(Endpoints.shelves.remove(id)),
    onSuccess: (shelves) => {
      client.setQueryData(qk.shelves.mine, shelves);
      return client.invalidateQueries({ queryKey: qk.shelves.all });
    },
  });
}
