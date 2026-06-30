/**
 * crypto.ts — expo-crypto AES-256 helpers, BIP-39 wordlist (50 words)
 */
import * as ExpoCrypto from 'expo-crypto';

// ─── AES-256 helpers ────────────────────────────────────────────────────────
// Note: expo-crypto provides hashing; for full AES encryption in production,
// use react-native-quick-crypto or a dedicated library.
// These helpers demonstrate the interface and use SHA-256 as key derivation.

/**
 * Generate a random 256-bit key as a hex string
 */
export async function generateKey(): Promise<string> {
  const bytes = await ExpoCrypto.getRandomBytesAsync(32);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a value using SHA-256 (use as key derivation step)
 */
export async function sha256(value: string): Promise<string> {
  return ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    value
  );
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return ExpoCrypto.randomUUID();
}

/**
 * Generate a mock AES-256 encrypted payload (stub for demo)
 * In production: use react-native-quick-crypto AES-GCM
 */
export async function encryptPayload(plaintext: string, keyHex: string): Promise<{ ciphertext: string; iv: string }> {
  const ivBytes = await ExpoCrypto.getRandomBytesAsync(16);
  const iv = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  // Stub: in production, perform real AES-256-GCM encryption here
  const ciphertext = await sha256(plaintext + keyHex + iv);
  return { ciphertext, iv };
}

// ─── BIP-39 wordlist (50-word subset for demo) ───────────────────────────────

export const BIP39_WORDS_50 = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
  'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
  'alert', 'alien',
] as const;

/**
 * Generate a random BIP-39-style mnemonic (12 words from the 50-word subset)
 */
export async function generateMnemonic(wordCount: 12 | 24 = 12): Promise<string> {
  const bytes = await ExpoCrypto.getRandomBytesAsync(wordCount);
  const words = Array.from(bytes).map(b => BIP39_WORDS_50[b % BIP39_WORDS_50.length]);
  return words.join(' ');
}

/**
 * Hash a PIN for storage (salted SHA-256)
 */
export async function hashPIN(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const s = salt ?? (await generateKey()).slice(0, 16);
  const hash = await sha256(pin + s);
  return { hash, salt: s };
}
