import React, { useState } from 'react';
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
  // Avatars are remote (generated portraits, or an author photo from Open
  // Library) and a 404 must not leave a blank disc, so a failed load falls
  // back to initials exactly as a missing URL does.
  const [failed, setFailed] = useState(false);

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
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={theme.duration(theme.motion.fast)}
          cachePolicy="memory-disk"
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
