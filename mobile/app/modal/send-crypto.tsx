/**
 * Send Crypto Modal — Address input + PIN confirmation
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/GlassCard';
import { theme } from '@/lib/theme';

type Step = 'address' | 'amount' | 'pin' | 'confirm';

export default function SendCryptoModal() {
  const insets = useSafeAreaInsets();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');

  const handleNext = () => {
    if (step === 'address') {
      if (address.length < 10) {
        Alert.alert('Invalid address', 'Please enter a valid wallet address.');
        return;
      }
      setStep('amount');
    } else if (step === 'amount') {
      if (!parseFloat(amount)) {
        Alert.alert('Invalid amount', 'Please enter a valid amount.');
        return;
      }
      setStep('pin');
    } else if (step === 'pin') {
      if (pin.length < 4) {
        Alert.alert('PIN required', 'Enter your 4–6 digit PIN to authorize.');
        return;
      }
      setStep('confirm');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      Alert.alert('Transaction Sent', `${amount} ${symbol} sent to ${address.slice(0, 10)}...`);
    }
  };

  const stepTitles: Record<Step, string> = {
    address: 'Recipient Address',
    amount:  'Amount to Send',
    pin:     'Authorize with PIN',
    confirm: 'Confirm Transaction',
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Close */}
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Send {symbol}</Text>
          <Text style={styles.subtitle}>{stepTitles[step]}</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {(['address', 'amount', 'pin', 'confirm'] as Step[]).map((s, i) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                ['address', 'amount', 'pin', 'confirm'].indexOf(step) > i && styles.stepDotDone,
              ]}
            />
          ))}
        </View>

        {/* Address step */}
        {step === 'address' && (
          <GlassCard style={styles.inputCard}>
            <Text style={styles.inputLabel}>Wallet Address</Text>
            <TextInput
              style={styles.addressInput}
              value={address}
              onChangeText={setAddress}
              placeholder={symbol === 'BTC' ? 'bc1q...' : '0x...'}
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <Pressable
              onPress={() => setAddress('0x742d35Cc6634C0532925a3b8D4C9b4c6cA0E2b3')}
              style={styles.pasteBtn}
            >
              <Text style={styles.pasteBtnText}>Paste from clipboard</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Amount step */}
        {step === 'amount' && (
          <GlassCard style={styles.inputCard}>
            <Text style={styles.inputLabel}>Amount ({symbol})</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            <Text style={styles.inputHint}>Available: 0.42 {symbol}</Text>
            <Pressable onPress={() => setAmount('0.42')} style={styles.maxBtn}>
              <Text style={styles.maxBtnText}>MAX</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* PIN step */}
        {step === 'pin' && (
          <GlassCard style={styles.inputCard}>
            <Text style={styles.inputLabel}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="• • • •"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            <Text style={styles.inputHint}>4–6 digit security PIN</Text>
          </GlassCard>
        )}

        {/* Confirm step */}
        {step === 'confirm' && (
          <GlassCard style={styles.confirmCard}>
            {[
              { label: 'Asset',      value: symbol ?? '' },
              { label: 'Amount',     value: `${amount} ${symbol}` },
              { label: 'To',         value: `${address.slice(0, 16)}...` },
              { label: 'Network fee', value: '~$2.50' },
            ].map(row => (
              <View key={row.label} style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{row.label}</Text>
                <Text style={styles.confirmValue}>{row.value}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* CTA */}
        <View style={styles.btnArea}>
          {step !== 'address' && (
            <Pressable
              onPress={() => {
                const steps: Step[] = ['address', 'amount', 'pin', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
              }}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          )}
          <Pressable onPress={handleNext} style={[styles.nextBtn, { flex: step !== 'address' ? 2 : 1 }]}>
            <Text style={styles.nextBtnText}>
              {step === 'confirm' ? `Send ${symbol}` : 'Next →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  content: { flex: 1, paddingHorizontal: 20, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, fontFamily: theme.fonts.display },
  subtitle: { fontSize: 14, color: theme.colors.textMuted },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepDotActive: { backgroundColor: theme.colors.accent, transform: [{ scale: 1.3 }] },
  stepDotDone: { backgroundColor: theme.colors.profit },
  inputCard: { gap: 10 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  addressInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pasteBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(79,70,229,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.3)',
  },
  pasteBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.accent },
  amountInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    textAlign: 'center',
  },
  inputHint: { fontSize: 11, color: theme.colors.textMuted },
  maxBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  maxBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.profit },
  pinInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 16,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 12,
  },
  confirmCard: { gap: 0, padding: 0 },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  confirmLabel: { fontSize: 13, color: theme.colors.textMuted },
  confirmValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text, fontFamily: theme.fonts.mono },
  btnArea: { flexDirection: 'row', gap: 10, marginTop: 'auto', marginBottom: 20 },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
