/**
 * Trade Screen — Mobile trading terminal
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { OrderBook } from '@/components/OrderBook';
import { PriceChart } from '@/components/PriceChart';
import { theme } from '@/lib/theme';

const PAIRS = ['BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'BNB/USDC', 'ARB/USDC'];

const MOCK_PRICES: Record<string, { price: number; change: number }> = {
  'BTC/USDC': { price: 95143.20, change: +1.24 },
  'ETH/USDC': { price: 3814.55,  change: +0.87 },
  'SOL/USDC': { price: 186.32,   change: +3.12 },
  'BNB/USDC': { price: 622.10,   change: -0.34 },
  'ARB/USDC': { price: 1.134,    change: +2.15 },
};

export default function TradeScreen() {
  const insets = useSafeAreaInsets();
  const [pair, setPair] = useState('BTC/USDC');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const current = MOCK_PRICES[pair];

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/modal/trade-confirm');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trade</Text>
        <Text style={[
          styles.priceTag,
          { color: current.change >= 0 ? theme.colors.profit : theme.colors.loss }
        ]}>
          {current.price.toLocaleString()} {current.change >= 0 ? '▲' : '▼'}{Math.abs(current.change)}%
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pair selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pairScroll}>
          {PAIRS.map(p => (
            <Pressable
              key={p}
              onPress={() => setPair(p)}
              style={[styles.pairChip, pair === p && styles.pairChipActive]}
            >
              <Text style={[styles.pairText, pair === p && styles.pairTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Price chart */}
        <GlassCard style={styles.chartCard}>
          <PriceChart pair={pair} />
        </GlassCard>

        {/* Order Book */}
        <GlassCard style={styles.orderBookCard}>
          <Text style={styles.sectionTitle}>Order Book</Text>
          <OrderBook pair={pair} />
        </GlassCard>

        {/* Order form */}
        <GlassCard style={styles.orderForm}>
          {/* Buy / Sell tabs */}
          <View style={styles.sideRow}>
            {(['buy', 'sell'] as const).map(s => (
              <Pressable
                key={s}
                onPress={() => setSide(s)}
                style={[
                  styles.sideBtn,
                  side === s && (s === 'buy' ? styles.sideBtnBuy : styles.sideBtnSell),
                ]}
              >
                <Text style={[
                  styles.sideBtnText,
                  side === s && { color: '#fff', fontWeight: '700' },
                ]}>
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Order type */}
          <View style={styles.orderTypeRow}>
            {(['market', 'limit'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => setOrderType(t)}
                style={[styles.orderTypeBtn, orderType === t && styles.orderTypeBtnActive]}
              >
                <Text style={[styles.orderTypeText, orderType === t && { color: theme.colors.accent }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price input (limit only) */}
          {orderType === 'limit' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price (USDC)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder={current.price.toString()}
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
          )}

          {/* Amount input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount ({pair.split('/')[0]})</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Total */}
          {amount ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {(parseFloat(amount || '0') * current.price).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
              </Text>
            </View>
          ) : null}

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: side === 'buy' ? theme.colors.profit : theme.colors.loss },
            ]}
          >
            <Text style={styles.submitBtnText}>
              {side === 'buy' ? 'Buy' : 'Sell'} {pair.split('/')[0]}
            </Text>
          </Pressable>
        </GlassCard>
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
  priceTag: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.mono,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  pairScroll: { marginBottom: 8 },
  pairChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 6,
  },
  pairChipActive: {
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderColor: 'rgba(79,70,229,0.5)',
  },
  pairText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  pairTextActive: { color: theme.colors.accent },
  chartCard: { marginBottom: 4 },
  orderBookCard: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  orderForm: { gap: 12 },
  sideRow: { flexDirection: 'row', gap: 8 },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  sideBtnBuy: { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' },
  sideBtnSell: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' },
  sideBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  orderTypeRow: { flexDirection: 'row', gap: 6 },
  orderTypeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  orderTypeBtnActive: {
    backgroundColor: 'rgba(79,70,229,0.15)',
    borderColor: 'rgba(79,70,229,0.4)',
  },
  orderTypeText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  totalLabel: { fontSize: 12, color: theme.colors.textMuted },
  totalValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text, fontFamily: theme.fonts.mono },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
