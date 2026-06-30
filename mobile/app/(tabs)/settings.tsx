/**
 * Settings Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { SecurityBadge } from '@/components/SecurityBadge';
import { theme } from '@/lib/theme';

interface SettingRow {
  label: string;
  subtitle?: string;
  type: 'toggle' | 'action' | 'info';
  value?: boolean;
  info?: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    twoFA: true,
    biometrics: true,
    notifications: true,
    priceAlerts: true,
    darkMode: true,
    copyTradeNotify: false,
    autoLock: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const sections = [
    {
      title: 'Security',
      rows: [
        { label: 'Two-Factor Authentication', subtitle: 'TOTP via authenticator app', type: 'toggle' as const, key: 'twoFA' },
        { label: 'Biometric Login', subtitle: 'Face ID / Touch ID', type: 'toggle' as const, key: 'biometrics' },
        { label: 'Auto-Lock', subtitle: 'Lock after 5 minutes idle', type: 'toggle' as const, key: 'autoLock' },
        { label: 'AES-256 Encryption', subtitle: 'Local key storage', type: 'info' as const, info: 'Active' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { label: 'Push Notifications', subtitle: 'Trade completions & alerts', type: 'toggle' as const, key: 'notifications' },
        { label: 'Price Alerts', subtitle: 'Custom thresholds', type: 'toggle' as const, key: 'priceAlerts' },
        { label: 'Copy Trade Events', subtitle: 'Agent executions', type: 'toggle' as const, key: 'copyTradeNotify' },
      ],
    },
    {
      title: 'Appearance',
      rows: [
        { label: 'Dark Mode', subtitle: 'Deep Space theme', type: 'toggle' as const, key: 'darkMode' },
      ],
    },
    {
      title: 'Account',
      rows: [
        { label: 'API Configuration', subtitle: 'Backend URL & keys', type: 'action' as const, key: '' },
        { label: 'Export Portfolio', subtitle: 'CSV / JSON export', type: 'action' as const, key: '' },
        { label: 'Clear Cache', subtitle: 'Force sync from server', type: 'action' as const, key: '' },
        { label: 'App Version', type: 'info' as const, info: '1.0.0 (build 1)' },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <SecurityBadge />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>User</Text>
            <Text style={styles.profileEmail}>user@homeforai.app</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>Pro</Text>
          </View>
        </GlassCard>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <GlassCard style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <View
                  key={row.label}
                  style={[
                    styles.settingRow,
                    i > 0 && styles.settingRowBorder,
                  ]}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingLabel}>{row.label}</Text>
                    {'subtitle' in row && row.subtitle ? (
                      <Text style={styles.settingSubtitle}>{row.subtitle}</Text>
                    ) : null}
                  </View>

                  {row.type === 'toggle' && 'key' in row && row.key ? (
                    <Switch
                      value={settings[row.key as keyof typeof settings] as boolean}
                      onValueChange={() => toggle(row.key as keyof typeof settings)}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(79,70,229,0.5)' }}
                      thumbColor={settings[row.key as keyof typeof settings] ? theme.colors.accent : 'rgba(255,255,255,0.4)'}
                    />
                  ) : row.type === 'info' ? (
                    <Text style={styles.settingInfo}>{row.info}</Text>
                  ) : (
                    <Text style={styles.settingChevron}>›</Text>
                  )}
                </View>
              ))}
            </GlassCard>
          </View>
        ))}

        {/* Sign out */}
        <Pressable
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => {} },
          ])}
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(79,70,229,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  profileEmail: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  profileBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.profit },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: { gap: 0, padding: 0 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  settingLeft: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  settingSubtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  settingInfo: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.teal,
    fontFamily: theme.fonts.mono,
  },
  settingChevron: { fontSize: 20, color: theme.colors.textMuted, lineHeight: 24 },
  signOutBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: theme.colors.loss },
});
