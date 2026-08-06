import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { initials } from '@/lib/format';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  /** Draws a coloured ring — used to mark an active reading streak. */
  ring?: boolean;
  style?: ViewStyle;
}

export function Avatar({ name, uri, size = 40, ring = false, style }: AvatarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: ring ? 2 : 0,
          borderColor: theme.colors.streak,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={name}
        />
      ) : (
        <Text
          variant="smallStrong"
          style={{ color: theme.colors.primarySoftFg, fontSize: size * 0.36 }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
