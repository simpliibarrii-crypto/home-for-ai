/**
 * SecurityBadge — AES-256 / 2FA badge
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

interface SecurityBadgeProps {
  showAES?: boolean;
  show2FA?: boolean;
}

export function SecurityBadge({ showAES = true, show2FA = true }: SecurityBadgeProps) {
  return (
    <View style={styles.container}>
      {showAES && (
        <View style={styles.badge}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.text}>AES-256</Text>
        </View>
      )}
      {show2FA && (
        <View style={[styles.badge, styles.badge2FA]}>
          <Text style={styles.icon}>🛡</Text>
          <Text style={[styles.text, { color: theme.colors.profit }]}>2FA</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badge2FA: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  icon: { fontSize: 9 },
  text: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
  },
});
