import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface ScreenProps {
  children: React.ReactNode;
  /** Wraps the content in a ScrollView. Turn off for FlatList-backed screens. */
  scroll?: boolean;
  /** Horizontal page padding. */
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra bottom padding, e.g. to clear a sticky action bar. */
  bottomInset?: number;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  /** Avoids the keyboard — enable on form screens. */
  keyboardAware?: boolean;
}

/**
 * Page shell: background colour, safe-area handling, optional scrolling and
 * pull-to-refresh, and a max content width so the web build does not stretch
 * a phone layout across a desktop monitor.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  onRefresh,
  refreshing = false,
  bottomInset = 0,
  contentStyle,
  style,
  keyboardAware = false,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const inner: ViewStyle = {
    width: '100%',
    maxWidth: theme.layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: padded ? theme.spacing.lg : 0,
    paddingBottom: bottomInset + insets.bottom + theme.spacing.xl,
    gap: theme.spacing.xl,
    ...contentStyle,
  };

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, inner, { paddingBottom: 0 }]}>{children}</View>
  );

  const body = (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>{content}</View>
  );

  if (!keyboardAware) return body;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

/** Titled block used to structure long screens. */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[{ gap: theme.spacing.md }, style]}>
      {title || action ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          {title ? <SectionTitle>{title}</SectionTitle> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View
        style={{
          width: 3,
          height: 16,
          borderRadius: 2,
          backgroundColor: theme.colors.primary,
        }}
      />
      <Text variant="h2" numberOfLines={1} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
