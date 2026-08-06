import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** `[value, toggle, setValue]` — for sheets, modals and disclosure state. */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue] as const;
}

/**
 * Runs an async refresh and tracks its own pending flag, so pull-to-refresh
 * does not need a `useState` in every screen.
 */
export function useRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
