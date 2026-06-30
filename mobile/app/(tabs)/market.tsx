/**
 * Market Screen — Country indices with flags and performance
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { SparkLine } from '@/components/SparkLine';
import { theme } from '@/lib/theme';
import { useMarket } from '@/hooks/useMarket';

interface MarketIndex {
  country: string;
  flag: string;
  index: string;
  value: number;
  change: number;
  changePct: number;
  sparkData: number[];
}

const MOCK_INDICES: MarketIndex[] = [
  { country: 'United States', flag: '🇺🇸', index: 'S&P 500',    value: 5432.10, change: +28.4,  changePct: +0.52, sparkData: [5380, 5390, 5410, 5395, 5418, 5432] },
  { country: 'United States', flag: '🇺🇸', index: 'NASDAQ',     value: 17890.5, change: +95.2,  changePct: +0.54, sparkData: [17750, 17800, 17840, 17820, 17870, 17890] },
  { country: 'Canada',        flag: '🇨🇦', index: 'TSX',        value: 22145.8, change: -32.1,  changePct: -0.14, sparkData: [22190, 22180, 22160, 22145, 22150, 22145] },
  { country: 'Japan',         flag: '🇯🇵', index: 'Nikkei 225', value: 38920.0, change: +213.5, changePct: +0.55, sparkData: [38650, 38700, 38750, 38820, 38900, 38920] },
  { country: 'UK',            flag: '🇬🇧', index: 'FTSE 100',   value: 8245.3,  change: -18.2,  changePct: -0.22, sparkData: [8275, 8265, 8255, 8248, 8242, 8245] },
  { country: 'Germany',       flag: '🇩🇪', index: 'DAX',        value: 18543.2, change: +87.4,  changePct: +0.47, sparkData: [18420, 18460, 18490, 18515, 18540, 18543] },
  { country: 'China',         flag: '🇨🇳', index: 'SSE Comp.',  value: 3124.5,  change: +15.8,  changePct: +0.51, sparkData: [3098, 3105, 3110, 3118, 3122, 3124] },
  { country: 'Hong Kong',     flag: '🇭🇰', index: 'Hang Seng',  value: 17845.2, change: -124.3, changePct: -0.69, sparkData: [18020, 17980, 17940, 17890, 17850, 17845] },
  { country: 'Australia',     flag: '🇦🇺', index: 'ASX 200',    value: 7892.4,  change: +34.6,  changePct: +0.44, sparkData: [7840, 7855, 7865, 7875, 7885, 7892] },
  { country: 'France',        flag: '🇫🇷', index: 'CAC 40',     value: 7654.8,  change: +22.1,  changePct: +0.29, sparkData: [7620, 7630, 7640, 7648, 7652, 7654] },
  { country: 'Brazil',        flag: '🇧🇷', index: 'Ibovespa',   value: 125432,  change: -456.2, changePct: -0.36, sparkData: [126100, 125900, 125700, 125550, 125450, 125432] },
  { country: 'India',         flag: '🇮🇳', index: 'NIFTY 50',   value: 23105.5, change: +178.3, changePct: +0.78, sparkData: [22850, 22900, 22980, 23040, 23090, 23105] },
];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { loading, refresh } = useMarket();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filtered = MOCK_INDICES.filter(idx => {
    if (filter === 'gainers') return idx.changePct > 0;
    if (filter === 'losers')  return idx.changePct < 0;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market</Text>
        <Text style={styles.headerSub}>{MOCK_INDICES.length} global indices</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'gainers', 'losers'] as const).map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Index list */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((idx, i) => (
          <GlassCard key={i} style={styles.indexCard}>
            <View style={styles.indexRow}>
              {/* Flag + name */}
              <View style={styles.indexLeft}>
                <Text style={styles.flag}>{idx.flag}</Text>
                <View>
                  <Text style={styles.indexName}>{idx.index}</Text>
                  <Text style={styles.countryName}>{idx.country}</Text>
                </View>
              </View>

              {/* Spark */}
              <SparkLine
                data={idx.sparkData}
                color={idx.changePct >= 0 ? theme.colors.profit : theme.colors.loss}
                width={60}
                height={28}
              />

              {/* Value + change */}
              <View style={styles.indexRight}>
                <Text style={styles.indexValue}>
                  {idx.value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </Text>
                <Text style={[
                  styles.indexChange,
                  { color: idx.changePct >= 0 ? theme.colors.profit : theme.colors.loss }
                ]}>
                  {idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
                </Text>
              </View>
            </View>
          </GlassCard>
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
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderColor: 'rgba(79,70,229,0.5)',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  filterTextActive: {
    color: theme.colors.accent,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  indexCard: {
    marginBottom: 8,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indexLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flag: {
    fontSize: 24,
  },
  indexName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  countryName: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  indexRight: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  indexValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
  },
  indexChange: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.mono,
    marginTop: 2,
  },
});
