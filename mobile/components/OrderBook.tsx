/**
 * OrderBook — Bid/ask table component
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

const BASE_PRICES: Record<string, number> = {
  'BTC/USDC': 95143.20,
  'ETH/USDC': 3814.55,
  'SOL/USDC': 186.32,
  'BNB/USDC': 622.10,
  'ARB/USDC': 1.134,
};

function genSide(
  mid: number,
  count: number,
  direction: 'ask' | 'bid'
): Array<{ price: number; size: number; total: number }> {
  const rows = [];
  let cumulative = 0;
  for (let i = 0; i < count; i++) {
    const offset = (i + 1) * (mid * 0.0002);
    const price = direction === 'ask' ? mid + offset : mid - offset;
    const size = parseFloat((Math.random() * 2 + 0.01).toFixed(4));
    cumulative += size;
    rows.push({ price: parseFloat(price.toFixed(2)), size, total: parseFloat(cumulative.toFixed(4)) });
  }
  return rows;
}

interface OrderBookProps {
  pair: string;
}

export function OrderBook({ pair }: OrderBookProps) {
  const mid = BASE_PRICES[pair] ?? 100;

  const asks = useMemo(() => genSide(mid, 6, 'ask'), [pair]);
  const bids = useMemo(() => genSide(mid, 6, 'bid'), [pair]);

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <View style={styles.container}>
      {/* Headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { flex: 2 }]}>Price</Text>
        <Text style={[styles.header, { flex: 1.5, textAlign: 'right' }]}>Size</Text>
        <Text style={[styles.header, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
      </View>

      {/* Asks (reversed — top to mid) */}
      {[...asks].reverse().map((row, i) => (
        <View key={`ask-${i}`} style={styles.row}>
          <View style={[
            styles.depthBar,
            {
              width: `${(row.total / asks[asks.length - 1].total) * 100}%`,
              backgroundColor: 'rgba(239,68,68,0.08)',
            }
          ]} />
          <Text style={[styles.price, { color: theme.colors.loss, flex: 2 }]}>
            {formatPrice(row.price)}
          </Text>
          <Text style={[styles.size, { flex: 1.5 }]}>{row.size.toFixed(4)}</Text>
          <Text style={[styles.size, { flex: 1.5 }]}>{row.total.toFixed(4)}</Text>
        </View>
      ))}

      {/* Spread */}
      <View style={styles.spreadRow}>
        <Text style={styles.spreadLabel}>Mid</Text>
        <Text style={styles.spreadValue}>{formatPrice(mid)}</Text>
        <Text style={styles.spreadPct}>0.04% spread</Text>
      </View>

      {/* Bids */}
      {bids.map((row, i) => (
        <View key={`bid-${i}`} style={styles.row}>
          <View style={[
            styles.depthBar,
            {
              width: `${(row.total / bids[bids.length - 1].total) * 100}%`,
              backgroundColor: 'rgba(16,185,129,0.08)',
            }
          ]} />
          <Text style={[styles.price, { color: theme.colors.profit, flex: 2 }]}>
            {formatPrice(row.price)}
          </Text>
          <Text style={[styles.size, { flex: 1.5 }]}>{row.size.toFixed(4)}</Text>
          <Text style={[styles.size, { flex: 1.5 }]}>{row.total.toFixed(4)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 1 },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 2,
  },
  header: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  depthBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  price: {
    fontSize: 11,
    fontFamily: theme.fonts.mono,
    fontWeight: '600',
  },
  size: {
    fontSize: 11,
    fontFamily: theme.fonts.mono,
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  spreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginVertical: 2,
  },
  spreadLabel: { fontSize: 9, color: theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  spreadValue: { fontSize: 13, fontWeight: '800', color: theme.colors.text, fontFamily: theme.fonts.mono },
  spreadPct: { fontSize: 9, color: theme.colors.textMuted, marginLeft: 'auto' },
});
