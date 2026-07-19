import { generateMnemonic, validateMnemonic, walletFromMnemonic, getAddressForChain } from "../src/wallet";
import { decrypt, deriveKey, encrypt } from "../src/crypto";

describe("generateMnemonic", () => {
  test("generates a 12-word mnemonic", () => {
    const mnemonic = generateMnemonic();
    expect(mnemonic.split(" ").length).toBe(12);
  });

  test("generates unique mnemonics", () => {
    expect(generateMnemonic()).not.toBe(generateMnemonic());
  });
});

describe("validateMnemonic", () => {
  test("validates a known good mnemonic", () => {
    expect(validateMnemonic(generateMnemonic())).toBe(true);
  });

  test("rejects invalid input", () => {
    expect(validateMnemonic("invalid words that are not a mnemonic phrase")).toBe(false);
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
    const wallet0 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const wallet1 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 1);
    expect(wallet0.address).not.toBe(wallet1.address);
  });

  test("is deterministic for the same mnemonic and index", async () => {
    const wallet1 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const wallet2 = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    expect(wallet1.address).toBe(wallet2.address);
  });

  test("throws on invalid mnemonic", async () => {
    await expect(walletFromMnemonic("not a valid mnemonic")).rejects.toThrow();
  });

  test("encrypted private key can be round-tripped with the mnemonic-derived key", async () => {
    const wallet = await walletFromMnemonic(TEST_MNEMONIC, "evm", 0);
    const decrypted = decrypt(wallet.encryptedPrivateKey, deriveKey(TEST_MNEMONIC));
    expect(decrypted).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });
});

describe("getAddressForChain", () => {
  test("returns a valid EVM address", async () => {
    expect(await getAddressForChain(generateMnemonic())).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

describe("crypto", () => {
  const key = deriveKey("test-only encryption fixture");

  test("encrypt/decrypt round-trip", () => {
    const original = "Hello, Home for AI!";
    expect(decrypt(encrypt(original, key), key)).toBe(original);
  });

  test("each encrypt call produces a unique ciphertext", () => {
    expect(encrypt("test", key)).not.toBe(encrypt("test", key));
  });

  test("decrypt fails with a different derived key", () => {
    const ciphertext = encrypt("secret", key);
    expect(() => decrypt(ciphertext, deriveKey("different fixture"))).toThrow();
  });
});
