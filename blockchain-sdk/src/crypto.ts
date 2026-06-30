/**
 * @homeforai/blockchain-sdk — AES-256-GCM encrypt/decrypt helpers
 * Used for encrypting private keys at rest.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string: iv(12) + tag(16) + ciphertext.
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex.padEnd(64, "0").slice(0, 64), "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypts a base64-encoded AES-256-GCM ciphertext.
 */
export function decrypt(ciphertextB64: string, keyHex: string): string {
  const key = Buffer.from(keyHex.padEnd(64, "0").slice(0, 64), "hex");
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Derives a 32-byte encryption key from a user-provided password using SHA-256.
 * In production, use PBKDF2 or Argon2.
 */
export function deriveKey(password: string): string {
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(password).digest("hex");
}
