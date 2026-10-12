import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useCurrentUser } from '@/store/auth';
import { useCartCount, useUnreadCount } from '@/api/hooks';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  /** Shows a back chevron. Defaults to true on non-tab screens. */
  back?: boolean;
  /** Shows the cart and notifications buttons. */
  actions?: boolean;
  /** Show the profile avatar on the far right. Off by default: Profile is a tab. */
  showProfile?: boolean;
  right?: React.ReactNode;
  large?: boolean;
  style?: ViewStyle;
}

/**
 * Shared screen header. Expo Router's native header is disabled app-wide so
 * every screen gets the same typography, safe-area handling and action slots.
 */
export function AppHeader({
  title,
  subtitle,
  back = false,
  actions = false,
  showProfile,
  right,
  large = false,
  style,
}: AppHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const user = useCurrentUser();

  const unread = useUnreadCount();
  const cartCount = useCartCount();

  const shouldShowProfile = showProfile ?? false;

  return (
    <View
      style={[
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          backgroundColor: theme.colors.bg,
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
          minHeight: 40,
        }}
      >
        {/* Left Side: Back button + Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
          {back ? (
            <IconButton label={t('common.back')} onPress={() => router.back()}>
              <ArrowLeft size={22} color={theme.colors.fg} />
            </IconButton>
          ) : null}

          <View style={{ flex: 1, gap: 1 }}>
            {title ? (
              <Text variant={large ? 'display' : 'h2'} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="small" color="fgMuted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Side: Actions & Profile Icon strictly pushed to the right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          {right}

          {actions ? (
            <IconButton label={t('cart.title')} onPress={() => router.push('/cart')}>
              <View>
                <ShoppingBag size={21} color={theme.colors.fg} />
                {cartCount > 0 ? <CountBadge count={cartCount} /> : null}
              </View>
            </IconButton>
          ) : null}

          {actions ? (
            <IconButton label={t('nav.notifications')} onPress={() => router.push('/notifications')}>
              <View>
                <Bell size={21} color={theme.colors.fg} />
                {unread > 0 ? <Dot /> : null}
              </View>
            </IconButton>
          ) : null}

          {shouldShowProfile && user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('nav.profile')}
              onPress={() => router.push('/profile')}
              style={{ marginLeft: theme.spacing.xs }}
            >
              <Avatar uri={user.avatarUrl} name={user.name} size={34} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Dot() {
  const theme = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: -1,
        right: -1,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
        borderWidth: 1.5,
        borderColor: theme.colors.bg,
      }}
    />
  );
}

function CountBadge({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: -6,
        right: -8,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        borderWidth: 1.5,
        borderColor: theme.colors.bg,
      }}
    >
      <Text variant="caption" style={{ color: theme.colors.primaryFg, fontSize: 10, fontWeight: '700' }}>
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}
