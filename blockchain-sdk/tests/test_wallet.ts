/**
 * @homeforai/blockchain-sdk — Wallet Tests
 */

import { generateMnemonic, validateMnemonic, walletFromMnemonic, getAddressForChain } from "../src/wallet";
import { encrypt, decrypt } from "../src/crypto";

describe("generateMnemonic", () => {
  test("generates a 12-word mnemonic", () => {
    const mnemonic = generateMnemonic();
    expect(typeof mnemonic).toBe("string");
    const words = mnemonic.split(" ");
    expect(words.length).toBe(12);
  });

  test("generates unique mnemonics", () => {
    const m1 = generateMnemonic();
    const m2 = generateMnemonic();
    expect(m1).not.toBe(m2);
  });
});

describe("validateMnemonic", () => {
  test("validates a known good mnemonic", () => {
    const mnemonic = generateMnemonic();
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  test("rejects an invalid mnemonic", () => {
    expect(validateMnemonic("invalid words that are not a mnemonic phrase")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(validateMnemonic("")).toBe(false);
  });
});

describe("walletFromMnemonic", () => {
  const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  test("derives an EVM wallet from a known mnemonic", async () => {
    const wallet = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(wallet.publicKey).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(wallet.derivationPath).toBe("m/44'/60'/0'/0/0");
    expect(wallet.chainType).toBe("evm");
  });

  test("derives different addresses for different indices", async () => {
    const w0 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const w1 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 1);
    expect(w0.address).not.toBe(w1.address);
  });

  test("deterministic — same mnemonic + index = same address", async () => {
    const w1 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const w2 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    expect(w1.address).toBe(w2.address);
  });

  test("throws on invalid mnemonic", async () => {
    await expect(walletFromMnemonic("not a valid mnemonic")).rejects.toThrow();
  });

  test("encrypted private key can be round-tripped", async () => {
    const wallet = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const encKey = "4865ab3d2f17e9c0a1b5d8f042c7e36a91f0234567890abcdef1234567890ab";
    const decrypted = decrypt(wallet.encryptedPrivateKey, encKey);
    expect(decrypted).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });
});

describe("getAddressForChain", () => {
  test("returns a valid EVM address", async () => {
    const mnemonic = generateMnemonic();
    const address = await getAddressForChain(mnemonic);
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

describe("crypto", () => {
  const key = "4865ab3d2f17e9c0a1b5d8f042c7e36a91f0234567890abcdef1234567890ab";

  test("encrypt/decrypt round-trip", () => {
    const original = "Hello, Home for AI!";
    const ciphertext = encrypt(original, key);
    const decrypted = decrypt(ciphertext, key);
    expect(decrypted).toBe(original);
  });

  test("each encrypt call produces a unique ciphertext (random IV)", () => {
    const msg = "test";
    const c1 = encrypt(msg, key);
    const c2 = encrypt(msg, key);
    expect(c1).not.toBe(c2);
  });

  test("decrypt fails with wrong key", () => {
    const ciphertext = encrypt("secret", key);
    const wrongKey = "0000000000000000000000000000000000000000000000000000000000000000";
    expect(() => decrypt(ciphertext, wrongKey)).toThrow();
  });
});
