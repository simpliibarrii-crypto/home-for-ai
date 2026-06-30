/**
 * Wallet Screen — Crypto wallet with balances and send/receive
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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { SecurityBadge } from '@/components/SecurityBadge';
import { SparkLine } from '@/components/SparkLine';
import { theme } from '@/lib/theme';
import { useWallet } from '@/hooks/useWallet';

interface TokenBalance {
  symbol: string;
  name: string;
  emoji: string;
  balance: number;
  usdValue: number;
  change24h: number;
  spark: number[];
  address: string;
}

const MOCK_TOKENS: TokenBalance[] = [
  { symbol: 'BTC',  name: 'Bitcoin',    emoji: '₿',  balance: 0.42,   usdValue: 39941.40, change24h: +1.24, spark: [38800, 38900, 39100, 39200, 39800, 39941], address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { symbol: 'ETH',  name: 'Ethereum',   emoji: 'Ξ',  balance: 4.8,    usdValue: 18309.60, change24h: +0.87, spark: [18100, 18150, 18200, 18250, 18300, 18309], address: '0x742d35Cc6634C0532925a3b8D4C9b4c6cA0E2b3' },
  { symbol: 'SOL',  name: 'Solana',     emoji: '◎',  balance: 38.5,   usdValue: 7173.20,  change24h: +3.12, spark: [6800, 6900, 7000, 7050, 7150, 7173], address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
  { symbol: 'USDC', name: 'USD Coin',   emoji: '$',  balance: 1250,   usdValue: 1250,     change24h: 0,     spark: [1250, 1250, 1250, 1250, 1250, 1250], address: '0x742d35Cc6634C0532925a3b8D4C9b4c6cA0E2b3' },
  { symbol: 'BNB',  name: 'BNB',        emoji: '🔶', balance: 3.2,    usdValue: 1987.20,  change24h: -0.34, spark: [1995, 1990, 1985, 1988, 1984, 1987], address: '0xb93b0e5B7DCC7EeF9Ce3e9C0A69b56Db9e34E4a' },
  { symbol: 'ARB',  name: 'Arbitrum',   emoji: '🔵', balance: 450,    usdValue: 507,      change24h: +2.15, spark: [490, 495, 498, 502, 505, 507], address: '0x742d35Cc6634C0532925a3b8D4C9b4c6cA0E2b3' },
];

const totalUSD = MOCK_TOKENS.reduce((s, t) => s + t.usdValue, 0);

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { loading } = useWallet();
  const [hideBalances, setHideBalances] = useState(false);

  const handleSend = (token: TokenBalance) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/modal/send-crypto', params: { symbol: token.symbol } });
  };

  const handleReceive = (token: TokenBalance) => {
    Alert.alert(
      `Receive ${token.symbol}`,
      `Your ${token.symbol} address:\n\n${token.address}`,
      [{ text: 'Copy Address', onPress: () => {} }, { text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <SecurityBadge />
        </View>
        <Pressable onPress={() => setHideBalances(h => !h)} style={styles.hideBtn}>
          <Text style={styles.hideBtnText}>{hideBalances ? 'Show' : 'Hide'}</Text>
        </Pressable>
      </View>

      {/* Total balance */}
      <GlassCard style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Portfolio Value</Text>
        <Text style={styles.totalValue}>
          {hideBalances ? '••••••' : `$${totalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
        </Text>
        <Text style={styles.totalChange}>+$421.30 (0.62%) today</Text>
      </GlassCard>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_TOKENS.map(token => (
          <GlassCard key={token.symbol} style={styles.tokenCard}>
            <View style={styles.tokenRow}>
              {/* Emoji + name */}
              <View style={styles.tokenLeft}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.tokenEmoji}>{token.emoji}</Text>
                </View>
                <View>
                  <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
              </View>

              {/* Spark */}
              <SparkLine
                data={token.spark}
                color={token.change24h >= 0 ? theme.colors.profit : theme.colors.loss}
                width={56}
                height={24}
              />

              {/* Balance */}
              <View style={styles.tokenRight}>
                <Text style={styles.tokenBalance}>
                  {hideBalances ? '••••' : token.balance.toString()}
                </Text>
                <Text style={[
                  styles.tokenUSD,
                  { color: token.change24h >= 0 ? theme.colors.profit : token.change24h < 0 ? theme.colors.loss : theme.colors.textMuted },
                ]}>
                  {hideBalances ? '•••' : `$${token.usdValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable onPress={() => handleSend(token)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Send</Text>
              </Pressable>
              <Pressable onPress={() => handleReceive(token)} style={[styles.actionBtn, styles.actionBtnSecondary]}>
                <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>Receive</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}
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
  hideBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hideBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  totalCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
    paddingVertical: 20,
  },
  totalLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    marginTop: 6,
  },
  totalChange: { fontSize: 12, color: theme.colors.profit, marginTop: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  tokenCard: { gap: 10 },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  emojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79,70,229,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenEmoji: { fontSize: 18 },
  tokenSymbol: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  tokenName: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  tokenRight: { alignItems: 'flex-end', minWidth: 70 },
  tokenBalance: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
  },
  tokenUSD: {
    fontSize: 11,
    fontFamily: theme.fonts.mono,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(79,70,229,0.2)',
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.3)',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
