import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Compass, Home, Plus, Quote, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuthStatus } from '@/store/auth';
import QuickActionSheet from '@/components/layout/QuickActionSheet';
import { bump } from '@/lib/haptics';

/**
 * Five primary destinations, each a real screen.
 *
 * There used to be six tabs plus a "+" button pinned to the horizontal centre,
 * which with six tabs sat on the border between two of them and covered both.
 * One of the six, "Cart", was not a tab at all — pressing it was intercepted
 * and pushed /cart. The cart now lives in the header (with its count) on the
 * screens where people shop, and "+" floats at the bottom-right where it
 * covers nothing.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const status = useAuthStatus();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const tabBarHeight = theme.layout.tabBarHeight ?? 60;

  // Guests never mount the tab screens: they used to render for a frame before
  // the root redirect, firing a burst of authenticated requests that all 401'd.
  if (status === 'guest') return <Redirect href="/login" />;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.bg },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.fgMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            // The system gesture/navigation area sits below the bar.
            height: tabBarHeight + insets.bottom,
            paddingTop: 6,
            paddingBottom: insets.bottom + 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            fontFamily: theme.fonts.sans,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('nav.home'),
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t('nav.explore'),
            tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="quotes"
          options={{
            title: t('nav.quotes'),
            tabBarIcon: ({ color }) => <Quote size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="shelves"
          options={{
            title: t('nav.shelves'),
            tabBarIcon: ({ color }) => <Bookmark size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />
        {/* Still a route (deep links keep working), no longer a tab. */}
        <Tabs.Screen name="marketplace" options={{ href: null }} />
      </Tabs>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.create')}
        onPress={() => {
          bump();
          setQuickActionsVisible(true);
        }}
        style={({ pressed }) => ({
          position: 'absolute',
          zIndex: 50,
          right: theme.spacing.lg,
          bottom: tabBarHeight + insets.bottom + theme.spacing.md,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
          ...theme.elevation(3),
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Plus size={26} color={theme.colors.primaryFg} />
      </Pressable>

      <QuickActionSheet visible={quickActionsVisible} onClose={() => setQuickActionsVisible(false)} />
    </>
  );
}
