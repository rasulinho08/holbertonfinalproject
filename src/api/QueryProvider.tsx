import React, { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { ApiError } from './errors';

/**
 * React Query setup.
 *
 * Two bits of React Native wiring that the web defaults do not cover:
 *  - `onlineManager` has to be driven by NetInfo, otherwise queries never pause
 *    when the device drops off the network.
 *  - `focusManager` has to be driven by AppState, so returning from the
 *    background refetches instead of showing stale data.
 */

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        retry: (failureCount, error) => {
          // Never retry a 4xx — it will fail identically every time.
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createClient);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
