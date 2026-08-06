import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';
import type {
  AppNotification,
  Badge,
  BuddyMessage,
  BuddyRead,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
  Paginated,
} from '@/types';

/* ------------------------------ gamification ------------------------------ */

export function useBadges() {
  return useQuery({
    queryKey: qk.badges,
    queryFn: () => api.get<Badge[]>(Endpoints.gamification.badges),
  });
}

export function useLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric) {
  return useQuery({
    queryKey: qk.leaderboard(period, metric),
    queryFn: () =>
      api.get<Paginated<LeaderboardEntry>>(Endpoints.gamification.leaderboard, {
        period,
        metric,
        limit: 50,
      }),
    select: (page) => page.data,
  });
}

export interface StreakInfo {
  current: number;
  longest: number;
  readToday: boolean;
  weeklyPages?: number[];
}

export function useStreak() {
  return useQuery({
    queryKey: qk.streak,
    queryFn: () => api.get<StreakInfo>(Endpoints.gamification.streak),
  });
}

export function useCheckInStreak() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<StreakInfo>(Endpoints.gamification.checkIn),
    onSuccess: (streak) => {
      client.setQueryData(qk.streak, streak);
      return Promise.all([
        client.invalidateQueries({ queryKey: qk.auth.me }),
        client.invalidateQueries({ queryKey: qk.badges }),
      ]);
    },
  });
}

/* ------------------------------ notifications ----------------------------- */

export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () =>
      api.get<Paginated<AppNotification>>(Endpoints.notifications.list, { limit: 50 }),
    select: (page) => page.data,
  });
}

/** Unread count for the header dot. */
export function useUnreadCount(): number {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length ?? 0;
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(Endpoints.notifications.readAll),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(Endpoints.notifications.read(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.notifications }),
  });
}

/* ------------------------------- buddy reads ------------------------------ */

export function useBuddyReads() {
  return useQuery({
    queryKey: qk.buddyReads.all,
    queryFn: () => api.get<Paginated<BuddyRead>>(Endpoints.buddyReads.list, { limit: 50 }),
    select: (page) => page.data,
  });
}

export function useBuddyRead(id: string | undefined) {
  return useQuery({
    queryKey: qk.buddyReads.detail(id ?? ''),
    queryFn: () => api.get<BuddyRead>(Endpoints.buddyReads.detail(id!)),
    enabled: !!id,
  });
}

export function useBuddyMessages(id: string | undefined) {
  return useQuery({
    queryKey: qk.buddyReads.messages(id ?? ''),
    queryFn: () =>
      api.get<Paginated<BuddyMessage>>(Endpoints.buddyReads.messages(id!), { limit: 100 }),
    enabled: !!id,
    select: (page) => page.data,
  });
}

export function useCreateBuddyRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; bookId: string; targetDate?: string | null }) =>
      api.post<BuddyRead>(Endpoints.buddyReads.create, input),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.buddyReads.all }),
  });
}

export function useJoinBuddyRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<BuddyRead>(Endpoints.buddyReads.join(id)),
    onSuccess: (buddy) => {
      client.setQueryData(qk.buddyReads.detail(buddy.id), buddy);
      return client.invalidateQueries({ queryKey: qk.buddyReads.all });
    },
  });
}

export function useLeaveBuddyRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<BuddyRead>(Endpoints.buddyReads.leave(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.buddyReads.all }),
  });
}

export function useSendBuddyMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, chapter }: { id: string; body: string; chapter?: number | null }) =>
      api.post<BuddyMessage>(Endpoints.buddyReads.messages(id), { body, chapter }),
    onSuccess: (_msg, { id }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.buddyReads.messages(id) }),
        client.invalidateQueries({ queryKey: qk.buddyReads.detail(id) }),
      ]),
  });
}

export function useUpdateBuddyProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, page }: { id: string; page: number }) =>
      api.patch<BuddyRead>(Endpoints.buddyReads.progress(id), { page }),
    onSuccess: (buddy) => client.setQueryData(qk.buddyReads.detail(buddy.id), buddy),
  });
}
