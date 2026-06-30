/**
 * Agent Detail Modal — Full stats, chat button, copy toggle
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { CatAvatar } from '@/components/CatAvatar';
import { SparkLine } from '@/components/SparkLine';
import { theme } from '@/lib/theme';

const MOCK_AGENTS = [
  { id: '1', name: 'Luna', emoji: '🌙', strategy: 'Momentum', pnl: +18.4, pnlAbs: 8760, winRate: 68, trades: 142, sharpe: 1.84, maxDrawdown: -8.2, spark: [100, 105, 112, 108, 115, 118], status: 'active', copy: false },
  { id: '2', name: 'Orion', emoji: '⭐', strategy: 'Mean Revert', pnl: +11.2, pnlAbs: 5320, winRate: 72, trades: 89, sharpe: 2.10, maxDrawdown: -5.4, spark: [100, 98, 103, 106, 110, 111], status: 'active', copy: true },
  { id: '3', name: 'Nova', emoji: '🔥', strategy: 'Breakout', pnl: -3.1, pnlAbs: -1470, winRate: 44, trades: 61, sharpe: 0.72, maxDrawdown: -14.8, spark: [100, 102, 99, 97, 96, 96.9], status: 'idle', copy: false },
];

export default function AgentDetailModal() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agent = MOCK_AGENTS.find(a => a.id === id) ?? MOCK_AGENTS[0];
  const [copyEnabled, setCopyEnabled] = useState(agent.copy);

  const handleCopyToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopyEnabled(c => !c);
  };

  const handleChat = () => {
    router.back();
    Alert.alert('Chat', `Opening chat with ${agent.name}...`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Close button */}
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Agent header */}
        <GlassCard style={styles.agentHeader}>
          <CatAvatar emoji={agent.emoji} isActive={agent.status === 'active'} size={60} />
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentStrategy}>{agent.strategy}</Text>
            <View style={[styles.statusBadge, { backgroundColor: agent.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }]}>
              <View style={[styles.statusDot, { backgroundColor: agent.status === 'active' ? theme.colors.profit : theme.colors.textMuted }]} />
              <Text style={[styles.statusText, { color: agent.status === 'active' ? theme.colors.profit : theme.colors.textMuted }]}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* P&L chart */}
        <GlassCard>
          <Text style={styles.cardTitle}>P&L History</Text>
          <SparkLine
            data={agent.spark}
            color={agent.pnl >= 0 ? theme.colors.profit : theme.colors.loss}
            width={280}
            height={60}
          />
          <View style={styles.pnlRow}>
            <Text style={[styles.pnlPct, { color: agent.pnl >= 0 ? theme.colors.profit : theme.colors.loss }]}>
              {agent.pnl >= 0 ? '+' : ''}{agent.pnl}%
            </Text>
            <Text style={styles.pnlAbs}>
              {agent.pnlAbs >= 0 ? '+' : ''}${agent.pnlAbs.toLocaleString()}
            </Text>
          </View>
        </GlassCard>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Win Rate', value: `${agent.winRate}%`, color: theme.colors.profit },
            { label: 'Total Trades', value: agent.trades.toString(), color: theme.colors.text },
            { label: 'Sharpe Ratio', value: agent.sharpe.toFixed(2), color: theme.colors.teal },
            { label: 'Max Drawdown', value: `${agent.maxDrawdown}%`, color: theme.colors.loss },
          ].map(stat => (
            <GlassCard key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Copy trade toggle */}
        <GlassCard style={styles.copyCard}>
          <View style={styles.copyRow}>
            <View>
              <Text style={styles.copyTitle}>Copy Trading</Text>
              <Text style={styles.copySub}>Automatically mirror this agent's trades</Text>
            </View>
            <Pressable
              onPress={handleCopyToggle}
              style={[styles.copyToggle, copyEnabled && styles.copyToggleActive]}
            >
              <Text style={[styles.copyToggleText, copyEnabled && { color: theme.colors.accent }]}>
                {copyEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
          {copyEnabled && (
            <Text style={styles.copyWarning}>⚠ Trades execute with real funds. Set limits in Settings.</Text>
          )}
        </GlassCard>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable onPress={handleChat} style={styles.chatBtn}>
            <Text style={styles.chatBtnText}>💬 Chat with {agent.name}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  agentHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  agentInfo: { flex: 1, gap: 4 },
  agentName: { fontSize: 22, fontWeight: '800', color: theme.colors.text, fontFamily: theme.fonts.display },
  agentStrategy: { fontSize: 13, color: theme.colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  pnlRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  pnlPct: { fontSize: 22, fontWeight: '800', fontFamily: theme.fonts.mono },
  pnlAbs: { fontSize: 16, fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.fonts.mono, alignSelf: 'flex-end', marginBottom: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 16 },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: theme.fonts.mono, marginTop: 4 },
  copyCard: { gap: 10 },
  copyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  copySub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  copyToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  copyToggleActive: {
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderColor: 'rgba(79,70,229,0.5)',
  },
  copyToggleText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  copyWarning: { fontSize: 11, color: theme.colors.profit, backgroundColor: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 8 },
  actionRow: { gap: 10, marginBottom: 8 },
  chatBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.4)',
    alignItems: 'center',
  },
  chatBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.accent },
});
