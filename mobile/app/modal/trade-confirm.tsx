/**
 * Trade Confirmation Bottom Sheet
 */
import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { theme } from '@/lib/theme';

export default function TradeConfirmModal() {
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    Alert.alert('Order Submitted', 'Your order has been placed and will execute at the best available price.');
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.overlay]}>
      <Pressable style={styles.backdrop} onPress={handleCancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        <Text style={styles.title}>Confirm Order</Text>

        {/* Order summary */}
        <GlassCard style={styles.summaryCard}>
          {[
            { label: 'Pair',       value: 'BTC / USDC' },
            { label: 'Side',       value: 'BUY',        valueColor: theme.colors.profit },
            { label: 'Type',       value: 'Limit' },
            { label: 'Price',      value: '$94,800.00',  valueStyle: 'mono' },
            { label: 'Amount',     value: '0.001 BTC',   valueStyle: 'mono' },
            { label: 'Total',      value: '$94.80 USDC', valueStyle: 'mono' },
            { label: 'Fee (0.1%)', value: '$0.09',       valueStyle: 'mono' },
          ].map(row => (
            <View key={row.label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={[
                styles.summaryValue,
                row.valueStyle === 'mono' && { fontFamily: theme.fonts.mono },
                row.valueColor ? { color: row.valueColor } : {},
              ]}>
                {row.value}
              </Text>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.disclaimer}>
          Orders may execute at a slightly different price due to market movement. Slippage tolerance: 0.5%
        </Text>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
            <Text style={styles.confirmBtnText}>Place Order</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0d0d1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    textAlign: 'center',
  },
  summaryCard: { gap: 0, padding: 0 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  summaryLabel: { fontSize: 13, color: theme.colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.profit,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
