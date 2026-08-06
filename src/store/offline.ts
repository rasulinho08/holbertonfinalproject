import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';
import { storage, StorageKeys } from '@/lib/storage';

/**
 * Offline write queue.
 *
 * The spec asks that readers be able to update reading progress without a
 * connection and have it sync later. Reads are covered by the React Query cache;
 * this store covers the writes: when a shelf or progress mutation fails because
 * the device is offline, it is parked here and replayed — in order — as soon as
 * connectivity returns.
 */

export type PendingMutation =
  | { id: string; kind: 'shelf.set'; bookId: string; status: string; progressPage?: number }
  | { id: string; kind: 'shelf.remove'; bookId: string }
  | { id: string; kind: 'progress.update'; bookId: string; page: number };

/** `Omit` over a union has to distribute, or the variants collapse. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type NewMutation = DistributiveOmit<PendingMutation, 'id'>;

interface OfflineState {
  online: boolean;
  syncing: boolean;
  queue: PendingMutation[];

  hydrate: () => Promise<void>;
  setOnline: (online: boolean) => void;
  enqueue: (mutation: NewMutation) => void;
  flush: () => Promise<number>;
  clear: () => void;
}

let flushInFlight: Promise<number> | null = null;

export const useOffline = create<OfflineState>((set, get) => ({
  online: true,
  syncing: false,
  queue: [],

  hydrate: async () => {
    const saved = await storage.get<PendingMutation[]>(StorageKeys.offlineQueue);
    if (saved?.length) set({ queue: saved });
  },

  setOnline: (online) => {
    const wasOffline = !get().online;
    set({ online });
    // Coming back online is the trigger to drain the queue.
    if (online && wasOffline && get().queue.length > 0) void get().flush();
  },

  enqueue: (mutation) => {
    const entry = { ...mutation, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } as PendingMutation;
    const queue = [...get().queue, entry];
    set({ queue });
    void storage.set(StorageKeys.offlineQueue, queue);
  },

  flush: async () => {
    if (flushInFlight) return flushInFlight;
    const { queue } = get();
    if (queue.length === 0) return 0;

    set({ syncing: true });

    flushInFlight = (async () => {
      const remaining: PendingMutation[] = [];
      let replayed = 0;

      for (const item of queue) {
        try {
          switch (item.kind) {
            case 'shelf.set':
              await api.put(Endpoints.shelves.setForBook(item.bookId), {
                status: item.status,
                progressPage: item.progressPage,
              });
              break;
            case 'shelf.remove':
              await api.delete(Endpoints.shelves.removeForBook(item.bookId));
              break;
            case 'progress.update':
              await api.patch(Endpoints.shelves.progress(item.bookId), { page: item.page });
              break;
          }
          replayed += 1;
        } catch {
          // Still failing — keep it queued for the next reconnect.
          remaining.push(item);
        }
      }

      set({ queue: remaining, syncing: false });
      await storage.set(StorageKeys.offlineQueue, remaining);
      flushInFlight = null;
      return replayed;
    })();

    return flushInFlight;
  },

  clear: () => {
    set({ queue: [] });
    void storage.remove(StorageKeys.offlineQueue);
  },
}));

/** Subscribes the store to NetInfo. Called once from the root layout. */
export function startConnectivityWatcher(): () => void {
  void useOffline.getState().hydrate();

  return NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    useOffline.getState().setOnline(online);
  });
}
