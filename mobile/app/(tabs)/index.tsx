/**
 * Workshop Screen — AI Agent Hub
 * Shows 8 cat agent cards with P&L and copy-trade toggles
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { GlassCard } from '@/components/GlassCard';
import { AgentCard } from '@/components/AgentCard';
import { MarketTicker } from '@/components/MarketTicker';
import { theme } from '@/lib/theme';
import { useAgents } from '@/hooks/useAgents';

export default function WorkshopScreen() {
  const insets = useSafeAreaInsets();
  const { agents, loading, refresh } = useAgents();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Workshop</Text>
          <Text style={styles.headerSub}>8 AI agents · 3 live</Text>
        </View>
        <GlassCard style={styles.portfolioChip}>
          <Text style={styles.portfolioValue}>$47,823</Text>
          <Text style={styles.portfolioChange}>+2.6% ▲</Text>
        </GlassCard>
      </View>

      {/* Market ticker */}
      <MarketTicker />

      {/* Agent grid */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Active Agents</Text>
        {agents.filter(a => a.status === 'active').map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onPress={() => router.push({ pathname: '/modal/agent-detail', params: { id: agent.id } })}
          />
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Idle Agents</Text>
        {agents.filter(a => a.status !== 'active').map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onPress={() => router.push({ pathname: '/modal/agent-detail', params: { id: agent.id } })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  portfolioChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  portfolioValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
  },
  portfolioChange: {
    fontSize: 10,
    color: theme.colors.profit,
    fontWeight: '600',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
});
