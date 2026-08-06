import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import * as haptics from '@/lib/haptics';
import { Text } from './Text';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastApi {
  show: (text: string, tone?: ToastTone) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  warning: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    if (tone === 'success') haptics.success();
    else if (tone === 'error') haptics.fail();
    else if (tone === 'warning') haptics.warn();

    setMessage({ id: nextId.current++, tone, text });
    timer.current = setTimeout(() => setMessage(null), DURATION);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api: ToastApi = {
    show,
    success: useCallback((t: string) => show(t, 'success'), [show]),
    error: useCallback((t: string) => show(t, 'error'), [show]),
    info: useCallback((t: string) => show(t, 'info'), [show]),
    warning: useCallback((t: string) => show(t, 'warning'), [show]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? <ToastView key={message.id} message={message} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ message }: { message: ToastMessage }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 80 }).start();
  }, [anim]);

  const tones = {
    success: { color: theme.colors.success, Icon: CheckCircle2 },
    error: { color: theme.colors.danger, Icon: XCircle },
    warning: { color: theme.colors.warning, Icon: AlertTriangle },
    info: { color: theme.colors.info, Icon: Info },
  } as const;

  const { color, Icon } = tones[message.tone];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        bottom: insets.bottom + theme.layout.tabBarHeight + theme.spacing.lg,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          paddingRight: theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.card,
          borderLeftWidth: 4,
          borderLeftColor: color,
          ...theme.elevation(3),
        }}
      >
        <Icon size={20} color={color} />
        <Text variant="small" style={{ flex: 1 }}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
