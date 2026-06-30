/**
 * CatAvatar — Cat emoji avatar with colored glow ring
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

interface CatAvatarProps {
  emoji: string;
  isActive?: boolean;
  size?: number;
}

export function CatAvatar({ emoji, isActive = false, size = 40 }: CatAvatarProps) {
  const glowColor = isActive ? theme.colors.profit : 'rgba(255,255,255,0.1)';

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: glowColor,
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isActive ? 0.8 : 0.2,
        shadowRadius: isActive ? 8 : 3,
      }
    ]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>

      {/* Active indicator dot */}
      {isActive && (
        <View style={[
          styles.activeDot,
          { backgroundColor: theme.colors.profit }
        ]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.15)',
    elevation: 4,
  },
  activeDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#050508',
  },
});
