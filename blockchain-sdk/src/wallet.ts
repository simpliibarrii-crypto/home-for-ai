/**
 * @homeforai/blockchain-sdk — HD Wallet (BIP-39/BIP-44)
 *
 * Uses @scure/bip39 for mnemonic generation and @scure/bip32 for
 * hierarchical deterministic key derivation.
 *
 * EVM path:  m/44'/60'/0'/0/<index>
 * Solana path: m/44'/501'/<index>'/0'
 */

import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import { encrypt } from "./crypto";

export type ChainType = "evm" | "solana";

export interface WalletResult {
  address: string;
  publicKey: string;
  /** AES-256-GCM encrypted private key (base64). Decrypt with crypto.decrypt(). */
  encryptedPrivateKey: string;
  /** BIP-44 derivation path used */
  derivationPath: string;
  chainType: ChainType;
}

// Internal key for encrypting private keys within SDK (replace in production with user-derived key)
const INTERNAL_ENCRYPT_KEY = "4865ab3d2f17e9c0a1b5d8f042c7e36a91f0234567890abcdef1234567890ab";

/**
 * Generates a new 12-word BIP-39 mnemonic.
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128); // 128 bits = 12 words
}

/**
 * Validates a BIP-39 mnemonic.
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

/**
 * Derives an EVM wallet from a mnemonic using BIP-44 path m/44'/60'/0'/0/<index>.
 */
function deriveEvmWallet(seed: Uint8Array, index: number): WalletResult {
  const path = `m/44'/60'/0'/0/${index}`;
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive wallet key");
  }

  // Convert to EVM address (keccak256 of public key, last 20 bytes)
  // We use a simple hex approach without ethers to avoid heavy imports
  const privKeyHex = Buffer.from(child.privateKey).toString("hex");
  const pubKeyHex = Buffer.from(child.publicKey).toString("hex");

  // Derive EVM address from uncompressed public key via keccak256
  // Using the ethers-compatible approach
  const { keccak_256 } = require("@noble/hashes/sha3");
  // Decompress the 33-byte compressed pubkey to 65-byte uncompressed
  const { secp256k1 } = require("@noble/curves/secp256k1");
  const uncompressed = secp256k1.ProjectivePoint.fromHex(pubKeyHex).toRawBytes(false);
  // Skip the 0x04 prefix byte, hash remaining 64 bytes
  const hash = keccak_256(uncompressed.slice(1));
  const address = "0x" + Buffer.from(hash).slice(12).toString("hex");
  // EIP-55 checksum
  const checksumAddress = toChecksumAddress(address);

  return {
    address: checksumAddress,
    publicKey: "0x" + pubKeyHex,
    encryptedPrivateKey: encrypt("0x" + privKeyHex, INTERNAL_ENCRYPT_KEY),
    derivationPath: path,
    chainType: "evm",
  };
}

/**
 * Derives a Solana wallet from a mnemonic using BIP-44 path m/44'/501'/<index>'/0'.
 */
function deriveSolanaWallet(seed: Uint8Array, index: number): WalletResult {
  const path = `m/44'/501'/${index}'/0'`;
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Solana wallet key");
  }

  const privKeyHex = Buffer.from(child.privateKey).toString("hex");
  const pubKeyHex = Buffer.from(child.publicKey).toString("hex");

  // Solana uses ed25519, address is base58 of 32-byte public key
  // Simplified: return hex pubkey as address placeholder
  const address = Buffer.from(child.publicKey).toString("base64");

  return {
    address,
    publicKey: pubKeyHex,
    encryptedPrivateKey: encrypt(privKeyHex, INTERNAL_ENCRYPT_KEY),
    derivationPath: path,
    chainType: "solana",
  };
}

/**
 * Derives a wallet from a mnemonic for the specified chain type and index.
 *
 * @param mnemonic - BIP-39 mnemonic phrase (12 or 24 words)
 * @param chainType - 'evm' for Ethereum/Polygon/Base/etc., 'solana' for Solana
 * @param index - account index (default 0)
 */
export async function walletFromMnemonic(
  mnemonic: string,
  chainType: ChainType = "evm",
  index = 0
): Promise<WalletResult> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid BIP-39 mnemonic");
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return chainType === "solana"
    ? deriveSolanaWallet(seed, index)
    : deriveEvmWallet(seed, index);
}

/**
 * Gets the primary EVM address for a mnemonic (index 0, BIP-44 path m/44'/60'/0'/0/0).
 */
export async function getAddressForChain(mnemonic: string): Promise<string> {
  const wallet = await walletFromMnemonic(mnemonic, "evm", 0);
  return wallet.address;
}

/**
 * EIP-55 checksum address encoding.
 */
function toChecksumAddress(address: string): string {
  const addr = address.toLowerCase().replace("0x", "");
  const { keccak_256 } = require("@noble/hashes/sha3");
  const hash = Buffer.from(keccak_256(addr)).toString("hex");
  let result = "0x";
  for (let i = 0; i < addr.length; i++) {
    result += parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return result;
}
