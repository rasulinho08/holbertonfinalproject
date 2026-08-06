import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type TypographyVariant } from '@/theme';

type ColorToken = 'fg' | 'fgMuted' | 'fgSubtle' | 'primary' | 'danger' | 'success' | 'warning' | 'accent' | 'primaryFg';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  /** Use the serif face — for quotes and long-form book copy. */
  serif?: boolean;
  center?: boolean;
  /** Overrides the weight coming from `variant`. */
  weight?: TextStyle['fontWeight'];
}

/**
 * Every string in the app renders through this component, so typography and
 * text colour can never drift from the tokens.
 */
export function Text({
  variant = 'body',
  color = 'fg',
  serif = false,
  center = false,
  weight,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const base = theme.typography[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          fontWeight: weight ?? (base.fontWeight as TextStyle['fontWeight']),
          letterSpacing: 'letterSpacing' in base ? base.letterSpacing : undefined,
          color: theme.colors[color],
          fontFamily: serif ? theme.fonts.serif : theme.fonts.sans,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}
