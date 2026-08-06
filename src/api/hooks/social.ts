import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { DEFAULT_PAGE_SIZE } from '../config';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type {
  ActivityItem,
  Comment,
  Paginated,
  Quote,
  ReportReason,
  Review,
  User,
  UserSummary,
} from '@/types';

/* --------------------------------- quotes --------------------------------- */

export interface QuoteFilters {
  bookId?: string;
  userId?: string;
  sort?: 'newest' | 'popular';
}

export function useQuotes(filters: QuoteFilters = {}) {
  return useInfiniteQuery({
    queryKey: qk.quotes.list(filters as Record<string, unknown>),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<Quote>>(Endpoints.quotes.list, {
        ...filters,
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: qk.quotes.detail(id ?? ''),
    queryFn: () => api.get<Quote>(Endpoints.quotes.detail(id!)),
    enabled: !!id,
  });
}

export interface CreateQuoteInput {
  bookId: string;
  text: string;
  page?: number | null;
  background: string;
}

export function useCreateQuote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => api.post<Quote>(Endpoints.quotes.create, input),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.quotes.all }),
        client.invalidateQueries({ queryKey: qk.books.all }),
        client.invalidateQueries({ queryKey: qk.auth.me }),
        client.invalidateQueries({ queryKey: qk.badges }),
      ]),
  });
}

export function useDeleteQuote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.quotes.remove(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.quotes.all }),
  });
}

/**
 * Like/unlike with an optimistic update.
 *
 * Social taps must feel instant, so the counter moves before the request
 * resolves and rolls back only if the server disagrees.
 */
export function useToggleQuoteLike() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked
        ? api.post<{ likesCount: number }>(Endpoints.quotes.like(id))
        : api.delete<{ likesCount: number }>(Endpoints.quotes.like(id)),

    onMutate: async ({ id, liked }) => {
      await client.cancelQueries({ queryKey: qk.quotes.all });
      const snapshot = client.getQueriesData<unknown>({ queryKey: qk.quotes.all });

      const patch = (quote: Quote): Quote =>
        quote.id === id
          ? { ...quote, isLiked: liked, likesCount: Math.max(0, quote.likesCount + (liked ? 1 : -1)) }
          : quote;

      client.setQueriesData<any>({ queryKey: qk.quotes.all }, (data: any) => {
        if (!data) return data;
        if (Array.isArray(data?.pages)) {
          return {
            ...data,
            pages: data.pages.map((p: Paginated<Quote>) => ({ ...p, data: p.data.map(patch) })),
          };
        }
        if (Array.isArray(data?.data)) return { ...data, data: data.data.map(patch) };
        if (data?.id) return patch(data as Quote);
        return data;
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },

    onSettled: () => client.invalidateQueries({ queryKey: qk.quotes.all }),
  });
}

/* -------------------------------- reviews --------------------------------- */

export interface CreateReviewInput {
  bookId: string;
  rating: number;
  body: string;
  isSpoiler: boolean;
  photos?: string[];
}

export function useCreateReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => api.post<Review>(Endpoints.reviews.create, input),
    onSuccess: (review) =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.books.reviews(review.bookId) }),
        client.invalidateQueries({ queryKey: qk.books.detail(review.bookId) }),
        client.invalidateQueries({ queryKey: qk.auth.me }),
        client.invalidateQueries({ queryKey: qk.badges }),
      ]),
  });
}

export function useDeleteReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(Endpoints.reviews.remove(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.books.all }),
  });
}

export function useToggleReviewLike() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.post(Endpoints.reviews.like(id)) : api.delete(Endpoints.reviews.like(id)),
    onSettled: () => client.invalidateQueries({ queryKey: qk.books.all }),
  });
}

/* -------------------------------- comments -------------------------------- */

export function useComments(target: 'review' | 'quote', id: string | undefined) {
  const key = target === 'review' ? qk.reviews.comments(id ?? '') : qk.quotes.comments(id ?? '');
  const path = target === 'review' ? Endpoints.reviews.comments : Endpoints.quotes.comments;

  return useQuery({
    queryKey: key,
    queryFn: () => api.get<Paginated<Comment>>(path(id!), { limit: 50 }),
    enabled: !!id,
    select: (page) => page.data,
  });
}

export function useAddComment(target: 'review' | 'quote') {
  const client = useQueryClient();
  const path = target === 'review' ? Endpoints.reviews.comments : Endpoints.quotes.comments;

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.post<Comment>(path(id), { body }),
    onSuccess: (_comment, { id }) =>
      client.invalidateQueries({
        queryKey: target === 'review' ? qk.reviews.comments(id) : qk.quotes.comments(id),
      }),
  });
}

/* --------------------------------- people --------------------------------- */

export function useUser(username: string | undefined) {
  return useQuery({
    queryKey: qk.users.detail(username ?? ''),
    queryFn: () => api.get<User>(Endpoints.users.byUsername(username!)),
    enabled: !!username,
  });
}

export function useFollowers(username: string | undefined) {
  return useQuery({
    queryKey: qk.users.followers(username ?? ''),
    queryFn: () =>
      api.get<Paginated<UserSummary & { isFollowing: boolean }>>(
        Endpoints.users.followers(username!),
        { limit: 50 },
      ),
    enabled: !!username,
    select: (page) => page.data,
  });
}

export function useFollowing(username: string | undefined) {
  return useQuery({
    queryKey: qk.users.following(username ?? ''),
    queryFn: () =>
      api.get<Paginated<UserSummary & { isFollowing: boolean }>>(
        Endpoints.users.following(username!),
        { limit: 50 },
      ),
    enabled: !!username,
    select: (page) => page.data,
  });
}

export function useToggleFollow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, follow }: { userId: string; follow: boolean }) =>
      follow
        ? api.post<{ followersCount: number }>(Endpoints.users.follow(userId))
        : api.delete<{ followersCount: number }>(Endpoints.users.follow(userId)),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.users.all }),
        client.invalidateQueries({ queryKey: qk.feed }),
        client.invalidateQueries({ queryKey: qk.badges }),
      ]),
  });
}

export function useUserActivity(username: string | undefined) {
  return useQuery({
    queryKey: qk.users.activity(username ?? ''),
    queryFn: () =>
      api.get<Paginated<ActivityItem>>(Endpoints.users.activity(username!), { limit: 30 }),
    enabled: !!username,
    select: (page) => page.data,
  });
}

export function useFriendsFeed() {
  return useQuery({
    queryKey: qk.feed,
    queryFn: () => api.get<Paginated<ActivityItem>>(Endpoints.feed.friends, { limit: 20 }),
    select: (page) => page.data,
  });
}

/* -------------------------------- reporting ------------------------------- */

export interface ReportInput {
  targetType: 'review' | 'quote';
  targetId: string;
  reason: ReportReason;
  note?: string;
  snapshotText: string;
  snapshotAuthor: string;
  snapshotBook?: string | null;
}

export function useReportContent() {
  return useMutation({
    mutationFn: (input: ReportInput) => api.post(Endpoints.reports.create, input),
  });
}

/* ----------------------------------- OCR ---------------------------------- */

export function useOcrExtract() {
  return useMutation({
    mutationFn: (input: { imageUri: string }) =>
      api.post<{ text: string; confidence: number }>(Endpoints.ocr.extract, input),
  });
}
