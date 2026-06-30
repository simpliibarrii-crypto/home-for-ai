/**
 * MarketTicker — Horizontal scrolling price ticker
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { theme } from '@/lib/theme';

const TICKER_ITEMS = [
  { symbol: 'BTC',  price: 95143,    change: +1.24 },
  { symbol: 'ETH',  price: 3814.55,  change: +0.87 },
  { symbol: 'SOL',  price: 186.32,   change: +3.12 },
  { symbol: 'AAPL', price: 228.45,   change: +0.54 },
  { symbol: 'NVDA', price: 875.20,   change: +1.87 },
  { symbol: 'XAU',  price: 3098.50,  change: -0.22 },
  { symbol: 'BNB',  price: 622.10,   change: -0.34 },
  { symbol: 'TSLA', price: 248.75,   change: +2.15 },
  { symbol: 'WTI',  price: 78.45,    change: +0.67 },
  { symbol: 'ARB',  price: 1.134,    change: +2.15 },
];

export function MarketTicker() {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TICKER_ITEMS.map(item => (
          <View key={item.symbol} style={styles.item}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <Text style={styles.price}>
              {item.price >= 1000
                ? item.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                : item.price.toFixed(2)}
            </Text>
            <Text style={[
              styles.change,
              { color: item.change >= 0 ? theme.colors.profit : theme.colors.loss },
            ]}>
              {item.change >= 0 ? '▲' : '▼'}{Math.abs(item.change).toFixed(2)}%
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    marginRight: 4,
  },
  symbol: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.mono,
  },
  price: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
  },
  change: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.mono,
  },
});
