/**
 * @homeforai/blockchain-sdk — Payment Protocol Tests
 */

import { payForCompute, verifyPayment, getBalance, buildPaymentRequestUri, APP_PAYMENT_RECEIVERS } from "../src/payments";
import { CHAINS } from "../src/chains";

describe("payForCompute", () => {
  test("creates a UserOperation for Raven AI", async () => {
    const result = await payForCompute({
      amount: 0.50,
      targetApp: "raven-ai",
      userId: "user_123",
    });
    expect(result.userOperation).toBeDefined();
    expect(result.userOperation.sender).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.userOperation.callData).toMatch(/^0x/);
    expect(result.mockTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.targetApp).toBe("raven-ai");
    expect(result.chain).toBe("base");
    expect(result.amountUsdc).toContain("USDC");
  });

  test("creates a UserOperation for OpenClinical AI", async () => {
    const result = await payForCompute({
      amount: 1.25,
      targetApp: "openclinical-ai",
      userId: "user_456",
      chain: "base",
    });
    expect(result.receiver).toBe(APP_PAYMENT_RECEIVERS["openclinical-ai"]);
    expect(result.status).toBe("pending");
  });

  test("uses custom sender address when provided", async () => {
    const senderAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const result = await payForCompute({
      amount: 0.10,
      targetApp: "hermes-edge",
      userId: "user_789",
      senderAddress,
    });
    expect(result.userOperation.sender).toBe(senderAddress);
  });

  test("UserOperation has required EIP-4337 fields", async () => {
    const result = await payForCompute({
      amount: 0.50,
      targetApp: "raven-ai",
      userId: "test",
    });
    const op = result.userOperation;
    expect(op.nonce).toMatch(/^0x/);
    expect(op.callGasLimit).toMatch(/^0x/);
    expect(op.verificationGasLimit).toMatch(/^0x/);
    expect(op.preVerificationGas).toMatch(/^0x/);
    expect(op.maxFeePerGas).toMatch(/^0x/);
    expect(op.maxPriorityFeePerGas).toMatch(/^0x/);
  });

  test("generates unique tx hashes", async () => {
    const r1 = await payForCompute({ amount: 0.50, targetApp: "raven-ai", userId: "u1" });
    const r2 = await payForCompute({ amount: 0.50, targetApp: "raven-ai", userId: "u1" });
    expect(r1.mockTxHash).not.toBe(r2.mockTxHash);
  });
});

describe("verifyPayment", () => {
  test("returns verified=true for a valid tx hash", async () => {
    const txHash = "0x" + "a".repeat(64);
    const result = await verifyPayment(txHash);
    expect(result.verified).toBe(true);
    expect(result.txHash).toBe(txHash);
    expect(result.chain).toBe("base");
  });

  test("returns verified=false for an invalid tx hash", async () => {
    const result = await verifyPayment("not-a-hash");
    expect(result.verified).toBe(false);
  });

  test("returns verified=false for short hash", async () => {
    const result = await verifyPayment("0xabc123");
    expect(result.verified).toBe(false);
  });

  test("includes checkedAt timestamp", async () => {
    const result = await verifyPayment("0x" + "b".repeat(64));
    expect(result.checkedAt).toBeDefined();
    expect(new Date(result.checkedAt).getTime()).toBeGreaterThan(0);
  });
});

describe("getBalance", () => {
  test("returns a balance string", async () => {
    const balance = await getBalance("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
    expect(typeof balance).toBe("string");
    const num = parseFloat(balance);
    expect(num).toBeGreaterThan(0);
  });

  test("returns a balance for any valid address", async () => {
    const balance = await getBalance("0x0000000000000000000000000000000000000001");
    expect(parseFloat(balance)).toBeGreaterThanOrEqual(100);
  });
});

describe("buildPaymentRequestUri", () => {
  test("builds a valid EIP-681 URI", () => {
    const uri = buildPaymentRequestUri("raven-ai", 0.50, "user_123", "base");
    expect(uri).toContain("ethereum:");
    expect(uri).toContain("transfer");
    expect(uri).toContain("raven-ai");
    expect(uri).toContain("user_123");
  });

  test("includes correct chain ID for Base", () => {
    const uri = buildPaymentRequestUri("raven-ai", 0.50, "user_123", "base");
    expect(uri).toContain(`@${CHAINS.base.chainId}/`);
  });
});

describe("CHAINS", () => {
  test("has all 8 chains", () => {
    const keys = Object.keys(CHAINS);
    expect(keys).toContain("ethereum");
    expect(keys).toContain("polygon");
    expect(keys).toContain("arbitrum");
    expect(keys).toContain("base");
    expect(keys).toContain("bsc");
    expect(keys).toContain("avalanche");
    expect(keys).toContain("optimism");
    expect(keys).toContain("solana");
  });

  test("Base chain has correct chainId", () => {
    expect(CHAINS.base.chainId).toBe(8453);
  });

  test("all chains have USDC addresses", () => {
    for (const [key, chain] of Object.entries(CHAINS)) {
      expect(chain.usdc).toBeTruthy();
    }
  });
});
