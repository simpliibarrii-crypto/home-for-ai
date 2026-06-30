/**
 * @homeforai/blockchain-sdk
 *
 * Shared blockchain identity and payment SDK for the Home for AI ecosystem.
 * Used by: Home for AI, Raven AI, OpenClinical AI, Hermes Edge.
 *
 * @example
 * ```typescript
 * import { generateMnemonic, walletFromMnemonic, payForCompute, createDID } from '@homeforai/blockchain-sdk';
 *
 * // Create a wallet
 * const mnemonic = generateMnemonic();
 * const wallet = await walletFromMnemonic(mnemonic, 'evm', 0);
 *
 * // Create a DID
 * const did = createDID(wallet.address);
 *
 * // Pay for Raven AI compute
 * const payment = await payForCompute({
 *   amount: 0.50,
 *   targetApp: 'raven-ai',
 *   userId: 'user_123',
 * });
 *
 * // Verify the payment was confirmed
 * const { verified } = await verifyPayment(payment.mockTxHash);
 * ```
 */

// ─── Chains ───────────────────────────────────────────────────────────────────
export { CHAINS, getChainById, getEvmChains } from "./chains";
export type { ChainConfig, ChainKey } from "./chains";

// ─── Crypto ───────────────────────────────────────────────────────────────────
export { encrypt, decrypt, deriveKey } from "./crypto";

// ─── Wallet ───────────────────────────────────────────────────────────────────
export {
  generateMnemonic,
  validateMnemonic,
  walletFromMnemonic,
  getAddressForChain,
} from "./wallet";
export type { WalletResult, ChainType } from "./wallet";

// ─── Identity (DID:ethr) ──────────────────────────────────────────────────────
export {
  createDID,
  resolveDID,
  signWithDID,
  parseDidJwt,
  isHomeForAIDID,
} from "./identity";
export type { DIDDocument, VerificationMethod, ServiceEndpoint, DIDJwt } from "./identity";

// ─── EIP-4337 Account Abstraction ─────────────────────────────────────────────
export {
  buildUserOperation,
  encodeErc20Transfer,
  encodeSmartAccountExecute,
  ENTRYPOINT_V07,
  ENTRYPOINT_V06,
} from "./eip4337";
export type { UserOperation, UserOpParams } from "./eip4337";

// ─── Payments ─────────────────────────────────────────────────────────────────
export {
  payForCompute,
  verifyPayment,
  getBalance,
  buildPaymentRequestUri,
  APP_PAYMENT_RECEIVERS,
} from "./payments";
export type {
  TargetApp,
  PayForComputeParams,
  PaymentResult,
  VerifyPaymentResult,
} from "./payments";

// ─── Agent NFT ────────────────────────────────────────────────────────────────
export {
  checkOwnership,
  getNFTMetadata,
  mintAgentNFT,
  transferAgentNFT,
  getNFTsByOwner,
  AGENT_NFT_CONTRACT,
} from "./nft";
export type { AgentNFT, MintResult } from "./nft";

// ─── HOMEAI Token ─────────────────────────────────────────────────────────────
export {
  getHomeAIBalance,
  toHomeAIWei,
  fromHomeAIWei,
  transferHomeAI,
  computeHomeAIPaymentAmount,
  HOMEAI_INFO,
  HOMEAI_TOKEN_ADDRESS,
  HOMEAI_DECIMALS,
  HOMEAI_CHAIN,
} from "./token";
export type { TokenInfo } from "./token";

// ─── SDK Version ──────────────────────────────────────────────────────────────
export const SDK_VERSION = "0.1.0";
export const SDK_NAME = "@homeforai/blockchain-sdk";
