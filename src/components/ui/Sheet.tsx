import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sheet grows with its content up to this share of the screen. */
  maxHeightRatio?: number;
  /** Turn off when the body owns its own scrolling (e.g. a FlatList). */
  scrollable?: boolean;
}

/**
 * Bottom sheet built on RN's `Modal` rather than a gesture library — it behaves
 * identically on iOS, Android and web, which matters because the sprint demo
 * runs in a browser.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.85,
  scrollable = true,
}: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ ...StyleSheetAbsoluteFill, backgroundColor: theme.colors.overlay }}
        />

        <View
          style={{
            maxHeight: `${maxHeightRatio * 100}%`,
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: theme.radius['2xl'],
            borderTopRightRadius: theme.radius['2xl'],
            paddingBottom: insets.bottom + theme.spacing.lg,
            ...theme.elevation(3),
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.borderStrong,
              }}
            />
          </View>

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.md,
                paddingBottom: theme.spacing.sm,
              }}
            >
              <Text variant="h2" style={{ flex: 1 }} numberOfLines={1}>
                {title}
              </Text>
              <IconButton label="Close" onPress={onClose}>
                <X size={20} color={theme.colors.fgMuted} />
              </IconButton>
            </View>
          ) : null}

          <Body
            {...(scrollable
              ? { contentContainerStyle: { padding: theme.spacing.lg, gap: theme.spacing.md } }
              : { style: { padding: theme.spacing.lg, gap: theme.spacing.md } })}
          >
            {children}
          </Body>
        </View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
