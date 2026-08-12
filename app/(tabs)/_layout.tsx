import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Compass, Home, ShoppingCart as ShoppingCartIcon, User, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCartCount } from '@/api/hooks';
import { Text } from '@/components/ui/Text';
import QuickActionSheet from '@/components/layout/QuickActionSheet';
import { bump } from '@/lib/haptics';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const cartCount = useCartCount();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  return (
    <View style={{ flex: 1 }}>
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
          name="marketplace"
          options={{
            title: t('nav.marketplace') ?? 'Marketplace',
            tabBarIcon: ({ color, size }) => (
              <TabIconWithBadge count={cartCount}>
                <ShoppingCartIcon size={size - 2} color={color} />
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

      {/* Floating central + button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.create')}
        onPress={() => {
          bump();
          setQuickActionsVisible(true);
        }}
        style={({ pressed }) => [
          styles.fabContainer,
          {
            bottom: theme.layout.tabBarHeight - 28, // float above the tab bar
            left: '50%',
            transform: [{ translateX: -28 }],
            backgroundColor: theme.colors.primary,
            borderRadius: 28,
            width: 56,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            ...theme.elevation(3),
            borderWidth: 1,
            borderColor: theme.colors.card,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Plus size={26} color={theme.colors.primaryFg} />
      </Pressable>

      <QuickActionSheet visible={quickActionsVisible} onClose={() => setQuickActionsVisible(false)} />
    </View>
  );
}

/** Cart count badge wrapper */
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

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 50,
  },
});
