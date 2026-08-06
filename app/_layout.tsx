import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/api/QueryProvider';
import { onSessionExpired } from '@/api/tokens';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { startConnectivityWatcher } from '@/store/offline';

/**
 * Root layout: providers, the auth/onboarding gate and the global stack.
 *
 * Provider order matters — theme has to sit above everything that renders, and
 * the toast layer has to sit above the navigator so toasts float over screens.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const logout = useAuth((s) => s.logout);
  const prefsHydrated = usePrefs((s) => s.hydrated);
  const onboardingDone = usePrefs((s) => s.onboardingDone);

  useEffect(() => {
    void bootstrap();
    const stopWatching = startConnectivityWatcher();
    // A failed token refresh drops the user back to the sign-in screen.
    const stopListening = onSessionExpired(() => void logout());
    return () => {
      stopWatching();
      stopListening();
    };
  }, [bootstrap, logout]);

  const ready = status !== 'loading' && prefsHydrated;

  useEffect(() => {
    if (!ready) return;

    // `segments` is typed as a tuple by expo-router's typed routes; widen it so
    // the nested route name can be read.
    const path = segments as unknown as string[];
    const inAuthGroup = path[0] === '(auth)';

    if (status === 'guest' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authenticated' && inAuthGroup && onboardingDone) {
      router.replace('/');
    } else if (status === 'authenticated' && !onboardingDone && path[1] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [ready, status, onboardingDone, segments, router]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bg,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="quote/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
