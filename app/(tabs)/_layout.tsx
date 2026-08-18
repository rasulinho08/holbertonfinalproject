import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Compass, Home, ShoppingBag, User, Bookmark, Quote, Plus } from 'lucide-react-native';
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

  const activeColor = theme.colors.primary;
  const inactiveColor = theme.colors.fgSubtle ?? '#8E8E93';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.bg },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            height: theme.layout.tabBarHeight ?? 60,
            paddingTop: 6,
            paddingBottom: 4,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '600',
            fontFamily: theme.fonts.sans,
          },
        }}
      >
        {/* 1. Главная */}
        <Tabs.Screen
          name="index"
          options={{
            title: t('nav.home') ?? 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size - 4} color={color} />,
          }}
        />

        {/* 2. Поиск / Обзор */}
        <Tabs.Screen
          name="explore"
          options={{
            title: t('nav.explore') ?? 'Explore',
            tabBarIcon: ({ color, size }) => <Compass size={size - 4} color={color} />,
          }}
        />

        {/* 3. КНОПКА КОРЗИНЫ (работает как обычная кнопка, без переключения таба) */}
        <Tabs.Screen
          name="marketplace"
          listeners={{
            tabPress: (e) => {
              
              e.preventDefault();
              bump();
              
              
              router.push('/cart'); 
            },
          }}
          options={{
            title: t('nav.cart') ?? 'Cart',
            tabBarIcon: ({ color, size }) => (
              <TabIconWithBadge count={cartCount}>
                <ShoppingBag size={size - 4} color={color} />
              </TabIconWithBadge>
            ),
          }}
        />

        {/* 4. Цитаты */}
        <Tabs.Screen
          name="quotes"
          options={{
            title: t('nav.quotes') ?? 'Quotes',
            tabBarIcon: ({ color }) => <Quote size={18} color={color} />,
          }}
        />

        
        <Tabs.Screen
          name="shelves"
          options={{
            title: t('nav.shelves') ?? 'Shelves',
            tabBarIcon: ({ color }) => <Bookmark size={18} color={color} />,
          }}
        />

        {/* 6. Профиль */}
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile') ?? 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size - 4} color={color} />,
          }}
        />
      </Tabs>

      
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.create') ?? 'Create'}
        onPress={() => {
          bump();
          setQuickActionsVisible(true);
        }}
        style={({ pressed }) => [
          styles.fabContainer,
          {
            bottom: (theme.layout.tabBarHeight ?? 60) - 24,
            left: '50%',
            transform: [{ translateX: -24 }],
            backgroundColor: theme.colors.primary,
            borderRadius: 24,
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            ...theme.elevation(3),
            borderWidth: 1,
            borderColor: theme.colors.card,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Plus size={22} color={theme.colors.primaryFg ?? '#FFFFFF'} />
      </Pressable>

      <QuickActionSheet visible={quickActionsVisible} onClose={() => setQuickActionsVisible(false)} />
    </View>
  );
}


function TabIconWithBadge({ count, children }: { count: number; children: React.ReactNode }) {
  const theme = useTheme();
  if (count <= 0) return <>{children}</>;

  return (
    <View>
      {children}
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -8,
          minWidth: 15,
          height: 15,
          paddingHorizontal: 3,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text variant="caption" style={{ color: theme.colors.primaryFg, fontSize: 8, fontWeight: '700' }}>
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