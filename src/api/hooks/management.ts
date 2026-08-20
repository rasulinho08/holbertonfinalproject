import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import { DEFAULT_PAGE_SIZE } from '../config';
import type {
  AdminQuote,
  AdminReview,
  AdminStats,
  AdminUserRow,
  Book,
  BookDraft,
  Order,
  OrderStatus,
  Paginated,
  Publication,
  PublicationDraft,
  PublicationSummary,
  PublisherStats,
  Quote,
  Report,
  Review,
} from '@/types';

/* -------------------------------- publisher ------------------------------- */

export function usePublisherStats(enabled = true) {
  return useQuery({
    queryKey: qk.publisher.stats,
    queryFn: () => api.get<PublisherStats>(Endpoints.publisher.stats),
    enabled,
  });
}

export function usePublisherBooks(enabled = true) {
  return useQuery({
    queryKey: qk.publisher.books,
    queryFn: () => api.get<Paginated<Book>>(Endpoints.publisher.books, { limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}

export function useCreatePublisherBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: BookDraft) => api.post<Book>(Endpoints.publisher.createBook, draft),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.publisher.books }),
        client.invalidateQueries({ queryKey: qk.publisher.stats }),
        client.invalidateQueries({ queryKey: qk.books.all }),
      ]),
  });
}

export function useUpdatePublisherBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<BookDraft> & { id: string }) =>
      api.patch<Book>(Endpoints.publisher.updateBook(id), patch),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.publisher.books }),
        client.invalidateQueries({ queryKey: qk.books.all }),
      ]),
  });
}

export function useDeletePublisherBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.publisher.removeBook(id)),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.publisher.books }),
        client.invalidateQueries({ queryKey: qk.books.all }),
      ]),
  });
}

export function usePublisherOrders(enabled = true) {
  return useQuery({
    queryKey: qk.publisher.orders,
    queryFn: () => api.get<Paginated<Order>>(Endpoints.publisher.orders, { limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}

export function useUpdateOrderStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<Order>(Endpoints.publisher.updateOrderStatus(id), { status }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.publisher.orders }),
        client.invalidateQueries({ queryKey: qk.orders.all }),
      ]),
  });
}

/* ---------------------------------- admin --------------------------------- */

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: qk.admin.stats,
    queryFn: () => api.get<AdminStats>(Endpoints.admin.stats),
    enabled,
    // The dashboard aggregates across the whole database; a minute of staleness
    // is invisible to a moderator and saves recomputing it on every focus.
    staleTime: 60_000,
  });
}

/** The user directory. `search` matches name, username or email. */
export function useAdminUsers(search = '', enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.admin.users(search),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<AdminUserRow>>(Endpoints.admin.users, {
        q: search || undefined,
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    enabled,
  });
}

export function useAdminReports(status?: 'open' | 'kept' | 'removed', enabled = true) {
  return useQuery({
    queryKey: qk.admin.reports(status),
    queryFn: () => api.get<Paginated<Report>>(Endpoints.admin.reports, { status, limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'keep' | 'remove' }) =>
      api.patch<Report>(Endpoints.admin.resolveReport(id), { action }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['admin'] }),
        client.invalidateQueries({ queryKey: qk.quotes.all }),
        client.invalidateQueries({ queryKey: qk.books.all }),
      ]),
  });
}

export function useAdminReviews(enabled = true) {
  return useQuery({
    queryKey: qk.admin.reviews,
    queryFn: () => api.get<Paginated<AdminReview>>(Endpoints.admin.reviews, { limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}

export function useAdminRemoveReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.admin.removeReview(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminQuotes(enabled = true) {
  return useQuery({
    queryKey: qk.admin.quotes,
    queryFn: () => api.get<Paginated<AdminQuote>>(Endpoints.admin.quotes, { limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}

export function useAdminRemoveQuote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.admin.removeQuote(id)),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['admin'] }),
        client.invalidateQueries({ queryKey: qk.quotes.all }),
      ]),
  });
}

/* ------------------------------ publications ------------------------------ */

export function usePublications(enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.posts.list,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<PublicationSummary>>(Endpoints.posts.list, {
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    enabled,
  });
}

export function usePublication(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.posts.detail(id),
    queryFn: () => api.get<Publication>(Endpoints.posts.detail(id)),
    enabled,
  });
}

export function useCreatePublication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: PublicationDraft) =>
      api.post<Publication>(Endpoints.admin.createPost, draft),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.posts.all }),
        client.invalidateQueries({ queryKey: qk.admin.posts }),
      ]),
  });
}

export function useUpdatePublication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<PublicationDraft> & { id: string }) =>
      api.put<Publication>(Endpoints.admin.updatePost(id), patch),
    onSuccess: (_, vars) =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.posts.all }),
        client.invalidateQueries({ queryKey: qk.admin.posts }),
        client.invalidateQueries({ queryKey: qk.posts.detail(vars.id) }),
      ]),
  });
}

export function useDeletePublication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.admin.removePost(id)),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.posts.all }),
        client.invalidateQueries({ queryKey: qk.admin.posts }),
      ]),
  });
}

/** Admin publication list (same list endpoint, queried with limit 100 and a separate cache key). */
export function useAdminPublications(enabled = true) {
  return useQuery({
    queryKey: qk.admin.posts,
    queryFn: () =>
      api.get<Paginated<PublicationSummary>>(Endpoints.admin.posts, { limit: 100 }),
    enabled,
    select: (page) => page.data,
  });
}
