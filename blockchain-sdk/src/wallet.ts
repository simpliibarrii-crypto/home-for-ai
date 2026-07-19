import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import { deriveKey, encrypt } from "./crypto";

export type ChainType = "evm" | "solana";

export interface WalletResult {
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  derivationPath: string;
  chainType: ChainType;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

function deriveEvmWallet(seed: Uint8Array, index: number, encryptionKey: string): WalletResult {
  const path = `m/44'/60'/0'/0/${index}`;
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive wallet key");
  }

  const privKeyHex = Buffer.from(child.privateKey).toString("hex");
  const pubKeyHex = Buffer.from(child.publicKey).toString("hex");
  const { keccak_256 } = require("@noble/hashes/sha3");
  const { secp256k1 } = require("@noble/curves/secp256k1");
  const uncompressed = secp256k1.ProjectivePoint.fromHex(pubKeyHex).toRawBytes(false);
  const hash = keccak_256(uncompressed.slice(1));
  const address = "0x" + Buffer.from(hash).slice(12).toString("hex");

  return {
    address: toChecksumAddress(address),
    publicKey: "0x" + pubKeyHex,
    encryptedPrivateKey: encrypt("0x" + privKeyHex, encryptionKey),
    derivationPath: path,
    chainType: "evm",
  };
}

function deriveSolanaWallet(seed: Uint8Array, index: number, encryptionKey: string): WalletResult {
  const path = `m/44'/501'/${index}'/0'`;
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Solana wallet key");
  }

  const privKeyHex = Buffer.from(child.privateKey).toString("hex");
  const pubKeyHex = Buffer.from(child.publicKey).toString("hex");

  return {
    address: Buffer.from(child.publicKey).toString("base64"),
    publicKey: pubKeyHex,
    encryptedPrivateKey: encrypt(privKeyHex, encryptionKey),
    derivationPath: path,
    chainType: "solana",
  };
}

export async function walletFromMnemonic(
  mnemonic: string,
  chainType: ChainType = "evm",
  index = 0
): Promise<WalletResult> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid BIP-39 mnemonic");
  }

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const encryptionKey = deriveKey(mnemonic);
  return chainType === "solana"
    ? deriveSolanaWallet(seed, index, encryptionKey)
    : deriveEvmWallet(seed, index, encryptionKey);
}

export async function getAddressForChain(mnemonic: string): Promise<string> {
  return (await walletFromMnemonic(mnemonic, "evm", 0)).address;
}

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
