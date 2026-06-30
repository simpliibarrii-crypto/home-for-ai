/**
 * @homeforai/blockchain-sdk — Cross-App Micropayment Protocol
 *
 * Enables users to pay for services across the Home for AI ecosystem:
 * - Home for AI  → Raven AI (research compute)
 * - Home for AI  → OpenClinical AI (clinical AI inference)
 * - Home for AI  → Hermes Edge (premium model weights)
 *
 * Payment flow uses EIP-4337 Account Abstraction on Base chain (low gas, fast).
 * USDC is the default payment token on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */

import { CHAINS, ChainKey } from "./chains";
import { buildUserOperation, encodeErc20Transfer, encodeSmartAccountExecute, UserOperation } from "./eip4337";
import { randomBytes } from "node:crypto";

export type TargetApp = "raven-ai" | "openclinical-ai" | "hermes-edge" | "home-for-ai";

/** Receiving wallets for each app (replace with real treasury addresses in production) */
export const APP_PAYMENT_RECEIVERS: Record<TargetApp, string> = {
  "raven-ai": "0xBadDB0b8Fe465E82B32D9b5c0E3571E214B9a5E1",
  "openclinical-ai": "0xC0fFee254729296a45a3885639AC7E10F9d54979",
  "hermes-edge": "0xDeAdBeEf000000000000000000000000dEAdbEEf",
  "home-for-ai": "0xABcDEf0123456789ABcDEf0123456789AbCdEf01",
};

export interface PayForComputeParams {
  /** Amount in USDC (e.g., 0.50 for $0.50) */
  amount: number;
  /** Target app to pay */
  targetApp: TargetApp;
  /** User ID in the Home for AI ecosystem */
  userId: string;
  /** Chain to use (defaults to 'base') */
  chain?: ChainKey;
  /** User's smart account address (EIP-4337 account) */
  senderAddress?: string;
}

export interface PaymentResult {
  userOperation: UserOperation;
  /** Mock transaction hash — replace with real bundler submission */
  mockTxHash: string;
  amountUsdc: string;
  targetApp: TargetApp;
  chain: ChainKey;
  receiver: string;
  estimatedGasUsd: string;
  status: "pending" | "submitted";
  createdAt: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  txHash: string;
  chain: ChainKey;
  checkedAt: string;
}

/**
 * Creates a UserOperation to pay for compute in a target app.
 *
 * In production, this UserOperation would be signed with the user's smart
 * account key and submitted to a Bundler (e.g., Pimlico, Alchemy AA).
 *
 * @example
 * ```typescript
 * const result = await payForCompute({
 *   amount: 0.50,
 *   targetApp: 'raven-ai',
 *   userId: 'user_123',
 * });
 * // Submit result.userOperation to bundler
 * // Then poll verifyPayment(result.mockTxHash) until confirmed
 * ```
 */
export async function payForCompute(params: PayForComputeParams): Promise<PaymentResult> {
  const chain = params.chain ?? "base";
  const chainConfig = CHAINS[chain];
  const receiver = APP_PAYMENT_RECEIVERS[params.targetApp];

  // USDC has 6 decimals
  const amountUsdc = Math.round(params.amount * 1_000_000);
  const usdcAddress = chainConfig.usdc;

  // Encode USDC transfer: transfer(receiver, amount)
  const transferCallData = encodeErc20Transfer(receiver, BigInt(amountUsdc));

  // Encode smart account execute: execute(usdcAddress, 0, transferCallData)
  const callData = encodeSmartAccountExecute(usdcAddress, BigInt(0), transferCallData);

  const senderAddress = params.senderAddress ?? generateMockSmartAccountAddress(params.userId);

  const userOp = buildUserOperation({
    sender: senderAddress,
    callData,
    chain,
  });

  const mockTxHash = "0x" + randomBytes(32).toString("hex");

  return {
    userOperation: userOp,
    mockTxHash,
    amountUsdc: `${params.amount.toFixed(6)} USDC`,
    targetApp: params.targetApp,
    chain,
    receiver,
    estimatedGasUsd: "$0.001",  // Base is very cheap
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifies a payment by transaction hash.
 *
 * In production, this queries the chain via RPC:
 * 1. eth_getTransactionReceipt(txHash)
 * 2. Parse UserOperationEvent log from EntryPoint
 * 3. Verify USDC Transfer event to the correct receiver
 *
 * Mock implementation: returns true for any valid 0x-prefixed 66-char hash.
 */
export async function verifyPayment(
  txHash: string,
  chain: ChainKey = "base"
): Promise<VerifyPaymentResult> {
  const isValidHash = /^0x[0-9a-fA-F]{64}$/.test(txHash);

  return {
    verified: isValidHash,
    txHash,
    chain,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Returns the USDC balance for an address on a given chain.
 *
 * In production, calls eth_call on the USDC contract:
 * balanceOf(address) → uint256
 *
 * Mock implementation returns a realistic demo balance.
 */
export async function getBalance(
  address: string,
  chain: ChainKey = "base"
): Promise<string> {
  // Mock: returns a deterministic balance based on address
  const addrNum = parseInt(address.slice(2, 8), 16);
  const balance = (100 + (addrNum % 9000)).toFixed(2);
  return balance;
}

/**
 * Returns the full payment URL for a given target app and amount.
 * Used to generate QR codes for cross-app payment requests.
 */
export function buildPaymentRequestUri(
  targetApp: TargetApp,
  amount: number,
  userId: string,
  chain: ChainKey = "base"
): string {
  const receiver = APP_PAYMENT_RECEIVERS[targetApp];
  const chainConfig = CHAINS[chain];
  const amountUsdc = Math.round(amount * 1_000_000);
  // EIP-681 URI format for token transfer
  return `ethereum:${chainConfig.usdc}@${chainConfig.chainId}/transfer?address=${receiver}&uint256=${amountUsdc}&label=${targetApp}&memo=${userId}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateMockSmartAccountAddress(userId: string): string {
  const { createHash } = require("node:crypto");
  const hash = createHash("sha256").update("homeforai-account:" + userId).digest("hex");
  return "0x" + hash.slice(0, 40);
}
