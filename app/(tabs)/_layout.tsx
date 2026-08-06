import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Compass, Home, Library, Quote, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCartCount } from '@/api/hooks';
import { Text } from '@/components/ui/Text';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const cartCount = useCartCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.bg },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.fgSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: theme.layout.tabBarHeight,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: theme.fonts.sans,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('nav.explore'),
          tabBarIcon: ({ color, size }) => <Compass size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: t('nav.quotes'),
          tabBarIcon: ({ color, size }) => <Quote size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shelves"
        options={{
          title: t('nav.shelves'),
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge count={cartCount}>
              <Library size={size - 2} color={color} />
            </TabIconWithBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}

/** Cart count rides on the Shelves tab, which is where the library lives. */
function TabIconWithBadge({ count, children }: { count: number; children: React.ReactNode }) {
  const theme = useTheme();
  if (count <= 0) return <>{children}</>;

  return (
    <View>
      {children}
      <View
        style={{
          position: 'absolute',
          top: -5,
          right: -9,
          minWidth: 16,
          height: 16,
          paddingHorizontal: 4,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text variant="caption" style={{ color: theme.colors.primaryFg, fontSize: 9 }}>
          {count > 9 ? '9+' : count}
        </Text>
      </View>
    </View>
  );
}
