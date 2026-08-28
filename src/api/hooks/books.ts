import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { DEFAULT_PAGE_SIZE } from '../config';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type { Author, Book, BookFilters, Genre, Paginated, Quote, Review } from '@/types';

/** `/books` adds a spelling suggestion to the standard page meta. */
type BookPage = Paginated<Book> & { meta: Paginated<Book>['meta'] & { suggestion?: string | null } };

function filtersToQuery(filters: BookFilters) {
  return {
    q: filters.q,
    genres: filters.genres,
    languages: filters.languages,
    minRating: filters.minRating,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: filters.sort,
    authorId: filters.authorId,
    publisherId: filters.publisherId,
  };
}

/** Paged catalogue browsing — Explore's main query. */
export function useBooks(filters: BookFilters = {}) {
  return useInfiniteQuery({
    queryKey: qk.books.list(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<BookPage>(Endpoints.books.list, {
        ...filtersToQuery(filters),
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: qk.books.detail(id ?? ''),
    queryFn: () => api.get<Book>(Endpoints.books.detail(id!)),
    enabled: !!id,
  });
}

export function useSimilarBooks(id: string | undefined) {
  return useQuery({
    queryKey: qk.books.similar(id ?? ''),
    queryFn: () => api.get<Paginated<Book>>(Endpoints.books.similar(id!)),
    enabled: !!id,
    select: (page) => page.data,
  });
}

export function useTrendingBooks() {
  return useQuery({
    queryKey: qk.books.trending,
    queryFn: () => api.get<Paginated<Book>>(Endpoints.books.trending, { limit: 12 }),
    select: (page) => page.data,
  });
}

export function useRecommendedBooks() {
  return useQuery({
    queryKey: qk.books.recommendations,
    queryFn: () => api.get<Paginated<Book>>(Endpoints.books.recommendations, { limit: 12 }),
    select: (page) => page.data,
  });
}

/** One random catalogue book matching the signed-in reader's onboarding prefs. */
export function useRandomRecommendation() {
  return useMutation({
    mutationFn: (excludeBookId?: string) =>
      api.get<Book>(Endpoints.books.randomRecommendation, {
        exclude: excludeBookId,
      }),
  });
}

export function useNewReleases() {
  return useQuery({
    queryKey: qk.books.newReleases,
    queryFn: () => api.get<Paginated<Book>>(Endpoints.books.newReleases, { limit: 12 }),
    select: (page) => page.data,
  });
}

export function useBookReviews(bookId: string | undefined) {
  return useQuery({
    queryKey: qk.books.reviews(bookId ?? ''),
    queryFn: () => api.get<Paginated<Review>>(Endpoints.books.reviews(bookId!), { limit: 50 }),
    enabled: !!bookId,
    select: (page) => page.data,
  });
}

export function useBookQuotes(bookId: string | undefined) {
  return useQuery({
    queryKey: qk.books.quotes(bookId ?? ''),
    queryFn: () => api.get<Paginated<Quote>>(Endpoints.books.quotes(bookId!), { limit: 50 }),
    enabled: !!bookId,
    select: (page) => page.data,
  });
}

export function useAuthor(id: string | undefined) {
  return useQuery({
    queryKey: qk.authors.detail(id ?? ''),
    queryFn: () => api.get<Author>(Endpoints.authors.detail(id!)),
    enabled: !!id,
  });
}

export function useAuthorBooks(id: string | undefined) {
  return useQuery({
    queryKey: qk.authors.books(id ?? ''),
    queryFn: () => api.get<Paginated<Book>>(Endpoints.authors.books(id!), { limit: 30 }),
    enabled: !!id,
    select: (page) => page.data,
  });
}

export function useGenres() {
  return useQuery({
    queryKey: qk.genres,
    queryFn: () => api.get<Genre[]>(Endpoints.genres.list),
    staleTime: 30 * 60_000, // the genre list barely changes
  });
}

export interface SearchSuggestions {
  books: { id: string; title: string; authorName: string }[];
  authors: { id: string; name: string }[];
  recent: string[];
}

export function useSearchSuggestions(term: string) {
  return useQuery({
    queryKey: qk.search.suggest(term),
    queryFn: () => api.get<SearchSuggestions>(Endpoints.search.suggest, { q: term }),
    // Only fire once the user has typed something meaningful.
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
  });
}
