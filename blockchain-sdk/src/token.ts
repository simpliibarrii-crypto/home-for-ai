/**
 * @homeforai/blockchain-sdk — HOMEAI Utility Token (ERC-20 on Base)
 *
 * HOMEAI is the native utility token of the Home for AI ecosystem.
 * Used for:
 * - Governance voting
 * - Discounted compute payments (10% off vs USDC)
 * - Agent NFT minting rewards
 * - Platform revenue sharing (staking)
 *
 * Contract: ERC-20 on Base (placeholder — deploy before mainnet)
 * Total supply: 1,000,000,000 HOMEAI
 * Decimals: 18
 */

import { CHAINS, ChainKey } from "./chains";
import { buildUserOperation, encodeErc20Transfer, encodeSmartAccountExecute, UserOperation } from "./eip4337";

/** Placeholder contract address — replace after deployment */
export const HOMEAI_TOKEN_ADDRESS = "0xHOMEAI0000000000000000000000000000000001";
export const HOMEAI_DECIMALS = 18;
export const HOMEAI_TOTAL_SUPPLY = 1_000_000_000n * (10n ** 18n);
export const HOMEAI_CHAIN: ChainKey = "base";

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  address: string;
  chain: ChainKey;
}

export const HOMEAI_INFO: TokenInfo = {
  name: "Home for AI Token",
  symbol: "HOMEAI",
  decimals: HOMEAI_DECIMALS,
  totalSupply: HOMEAI_TOTAL_SUPPLY.toString(),
  address: HOMEAI_TOKEN_ADDRESS,
  chain: HOMEAI_CHAIN,
};

/**
 * Returns the HOMEAI token balance for an address.
 * In production: calls balanceOf(address) on the ERC-20 contract.
 * Mock: returns a deterministic demo balance.
 */
export async function getHomeAIBalance(address: string): Promise<string> {
  const addrNum = parseInt(address.slice(2, 8) || "0", 16);
  const balance = (5000 + (addrNum % 95000)).toString();
  return balance;
}

/**
 * Converts HOMEAI amount (human-readable) to wei (BigInt).
 * @param amount - Human-readable amount (e.g., "100.5")
 */
export function toHomeAIWei(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(HOMEAI_DECIMALS, "0").slice(0, HOMEAI_DECIMALS);
  return BigInt(whole) * 10n ** BigInt(HOMEAI_DECIMALS) + BigInt(fracPadded);
}

/**
 * Converts HOMEAI wei to human-readable string.
 * @param wei - BigInt amount in wei
 */
export function fromHomeAIWei(wei: bigint): string {
  const divisor = 10n ** BigInt(HOMEAI_DECIMALS);
  const whole = (wei / divisor).toString();
  const frac = (wei % divisor).toString().padStart(HOMEAI_DECIMALS, "0");
  const trimmedFrac = frac.replace(/0+$/, "");
  return trimmedFrac ? `${whole}.${trimmedFrac}` : whole;
}

/**
 * Builds a UserOperation to transfer HOMEAI tokens.
 *
 * @param senderAddress - Smart account address
 * @param recipientAddress - Recipient address
 * @param amount - Amount in human-readable format (e.g., "100")
 * @param chain - Chain (default: base)
 */
export async function transferHomeAI(
  senderAddress: string,
  recipientAddress: string,
  amount: string,
  chain: ChainKey = "base"
): Promise<UserOperation> {
  const amountWei = toHomeAIWei(amount);
  const transferCallData = encodeErc20Transfer(recipientAddress, amountWei);
  const callData = encodeSmartAccountExecute(HOMEAI_TOKEN_ADDRESS, BigInt(0), transferCallData);

  return buildUserOperation({
    sender: senderAddress,
    callData,
    chain,
  });
}

/**
 * Computes HOMEAI discount for a USDC payment.
 * Paying in HOMEAI gives 10% discount on compute costs.
 *
 * @param usdcAmount - Amount in USDC (e.g., 0.50)
 * @param homeaiPriceUsd - Current HOMEAI price in USD (e.g., 0.01)
 * @returns Amount in HOMEAI to pay
 */
export function computeHomeAIPaymentAmount(
  usdcAmount: number,
  homeaiPriceUsd: number
): { homeaiAmount: string; discountPercent: number; savingsUsd: number } {
  const discount = 0.10;
  const discountedUsd = usdcAmount * (1 - discount);
  const homeaiAmount = (discountedUsd / homeaiPriceUsd).toFixed(2);
  return {
    homeaiAmount,
    discountPercent: discount * 100,
    savingsUsd: usdcAmount * discount,
  };
}
