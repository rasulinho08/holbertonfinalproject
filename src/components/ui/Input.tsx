import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Validation message; turns the field red when present. */
  error?: string;
  hint?: string;
  /** Element rendered inside the field, on the leading edge. */
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Adds a show/hide toggle and forces `secureTextEntry`. */
  password?: boolean;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, rightSlot, password, containerStyle, multiline, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={[{ gap: theme.spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="smallStrong" color="fgMuted">
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing.sm,
          minHeight: multiline ? 110 : 48,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: multiline ? theme.spacing.md : 0,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: theme.colors.subtle,
        }}
      >
        {icon}
        <TextInput
          ref={ref}
          multiline={multiline}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          placeholderTextColor={theme.colors.fgSubtle}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
          style={{
            flex: 1,
            color: theme.colors.fg,
            fontSize: theme.typography.body.fontSize,
            fontFamily: theme.fonts.sans,
            paddingVertical: multiline ? 0 : theme.spacing.md,
            textAlignVertical: multiline ? 'top' : 'center',
            // RN web adds a default focus ring that clashes with our border.
            ...({ outlineStyle: 'none' } as object),
          }}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden((v) => !v)}
          >
            {hidden ? (
              <Eye size={18} color={theme.colors.fgSubtle} />
            ) : (
              <EyeOff size={18} color={theme.colors.fgSubtle} />
            )}
          </Pressable>
        ) : (
          rightSlot
        )}
      </View>

      {error ? (
        <Text variant="small" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="fgSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
