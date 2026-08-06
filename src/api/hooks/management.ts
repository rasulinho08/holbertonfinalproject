import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type {
  AdminStats,
  Book,
  BookDraft,
  Order,
  OrderStatus,
  Paginated,
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
    queryFn: () => api.get<Paginated<Review>>(Endpoints.admin.reviews, { limit: 100 }),
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
    queryFn: () => api.get<Paginated<Quote>>(Endpoints.admin.quotes, { limit: 100 }),
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
