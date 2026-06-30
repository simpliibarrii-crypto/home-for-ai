/**
 * AgentCard — Cat agent card with avatar, P&L, copy toggle
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassCard } from './GlassCard';
import { CatAvatar } from './CatAvatar';
import { SparkLine } from './SparkLine';
import { theme } from '@/lib/theme';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  strategy: string;
  pnl: number;
  pnlAbs: number;
  winRate: number;
  trades: number;
  status: 'active' | 'idle' | 'paused';
  copy: boolean;
  spark: number[];
}

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
}

export function AgentCard({ agent, onPress }: AgentCardProps) {
  const [copyEnabled, setCopyEnabled] = useState(agent.copy);

  const handleCopyToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopyEnabled(value);
  };

  const isPositive = agent.pnl >= 0;

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          {/* Avatar */}
          <CatAvatar emoji={agent.emoji} isActive={agent.status === 'active'} size={44} />

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{agent.name}</Text>
              <View style={[
                styles.statusDot,
                { backgroundColor: agent.status === 'active' ? theme.colors.profit : theme.colors.textMuted }
              ]} />
            </View>
            <Text style={styles.strategy}>{agent.strategy}</Text>
          </View>

          {/* Spark + P&L */}
          <View style={styles.right}>
            <SparkLine
              data={agent.spark}
              color={isPositive ? theme.colors.profit : theme.colors.loss}
              width={56}
              height={24}
            />
            <Text style={[styles.pnl, { color: isPositive ? theme.colors.profit : theme.colors.loss }]}>
              {isPositive ? '+' : ''}{agent.pnl.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Footer stats + copy toggle */}
        <View style={styles.footer}>
          <View style={styles.statRow}>
            {[
              { label: 'Win Rate', value: `${agent.winRate}%` },
              { label: 'Trades',   value: agent.trades.toString() },
              { label: 'P&L',      value: `$${agent.pnlAbs.toLocaleString()}`, color: isPositive ? theme.colors.profit : theme.colors.loss },
            ].map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValue, s.color ? { color: s.color } : {}]}>{s.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.copyRow}>
            <Text style={styles.copyLabel}>Copy Trade</Text>
            <Switch
              value={copyEnabled}
              onValueChange={handleCopyToggle}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(79,70,229,0.5)' }}
              thumbColor={copyEnabled ? theme.colors.accent : 'rgba(255,255,255,0.4)'}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 10 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  strategy: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 3 },
  pnl: { fontSize: 13, fontWeight: '700', fontFamily: theme.fonts.mono },
  footer: { gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 9, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 12, fontWeight: '700', color: theme.colors.text, fontFamily: theme.fonts.mono },
  copyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyLabel: { fontSize: 12, color: theme.colors.textMuted },
});
