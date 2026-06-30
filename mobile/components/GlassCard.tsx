/**
 * GlassCard — Glassmorphism card using expo-blur
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  tint = 'dark',
}: GlassCardProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  inner: {
    padding: 14,
  },
});
