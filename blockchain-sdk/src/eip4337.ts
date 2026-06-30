/**
 * @homeforai/blockchain-sdk — EIP-4337 Account Abstraction UserOperation Builder
 *
 * EIP-4337: https://eips.ethereum.org/EIPS/eip-4337
 *
 * UserOperation is the core primitive of Account Abstraction.
 * It describes a transaction to be submitted via a Bundler to an EntryPoint contract.
 *
 * Base EntryPoint (v0.6): 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
 * Base EntryPoint (v0.7): 0x0000000071727De22E5E9d8BAf0edAc6f37da032
 */

import { CHAINS, ChainKey } from "./chains";
import { randomBytes, createHash } from "node:crypto";

// EIP-4337 EntryPoint contract address (v0.7 — same across all EVM chains)
export const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
// EIP-4337 EntryPoint v0.6 (widely deployed)
export const ENTRYPOINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

export interface UserOperation {
  sender: string;
  nonce: string;           // hex string
  initCode: string;        // hex — empty if account already deployed
  callData: string;        // hex — encoded function call
  callGasLimit: string;    // hex
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string; // hex — empty if no paymaster
  signature: string;        // hex — filled after signing
  // Metadata (not part of on-chain struct)
  _meta?: {
    chain: ChainKey;
    entryPoint: string;
    hash: string;
    createdAt: string;
  };
}

export interface UserOpParams {
  sender: string;
  callData: string;
  chain?: ChainKey;
  nonce?: bigint;
  isNewAccount?: boolean;
  factoryAddress?: string;
  paymasterAddress?: string;
}

/**
 * Builds an EIP-4337 UserOperation with sensible defaults for Base chain.
 * Gas values are estimates — in production use a Bundler's eth_estimateUserOperationGas.
 */
export function buildUserOperation(params: UserOpParams): UserOperation {
  const chain = params.chain ?? "base";
  const nonce = params.nonce ?? BigInt(0);

  // Default gas limits for Base chain (fast, cheap)
  const callGasLimit = "0x493E0";       // ~300k gas
  const verificationGasLimit = "0x186A0"; // ~100k gas
  const preVerificationGas = "0xC350";    // ~50k gas
  const maxFeePerGas = "0x3B9ACA00";      // 1 gwei
  const maxPriorityFeePerGas = "0x3B9ACA00";

  const userOp: UserOperation = {
    sender: params.sender,
    nonce: "0x" + nonce.toString(16),
    initCode: params.isNewAccount && params.factoryAddress
      ? buildInitCode(params.factoryAddress, params.sender)
      : "0x",
    callData: params.callData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: params.paymasterAddress
      ? params.paymasterAddress + "0".repeat(128)
      : "0x",
    signature: "0x",
    _meta: {
      chain,
      entryPoint: ENTRYPOINT_V07,
      hash: hashUserOperation(params.sender, params.callData),
      createdAt: new Date().toISOString(),
    },
  };

  return userOp;
}

/**
 * Encodes an ERC-20 transfer callData (e.g., USDC transfer).
 * Function selector for transfer(address,uint256): 0xa9059cbb
 */
export function encodeErc20Transfer(to: string, amountWei: bigint): string {
  const selector = "a9059cbb";
  const toHex = to.replace("0x", "").toLowerCase().padStart(64, "0");
  const amountHex = amountWei.toString(16).padStart(64, "0");
  return "0x" + selector + toHex + amountHex;
}

/**
 * Encodes a smart account's execute(address,uint256,bytes) callData.
 * Used to call an ERC-20 transfer from an EIP-4337 smart account.
 */
export function encodeSmartAccountExecute(
  target: string,
  value: bigint,
  data: string
): string {
  // Function selector for execute(address,uint256,bytes): 0xb61d27f6
  const selector = "b61d27f6";
  const targetHex = target.replace("0x", "").toLowerCase().padStart(64, "0");
  const valueHex = value.toString(16).padStart(64, "0");
  // offset for bytes parameter (starts at 0x60)
  const dataOffset = "0000000000000000000000000000000000000000000000000000000000000060";
  const innerData = data.replace("0x", "");
  const dataLen = (innerData.length / 2).toString(16).padStart(64, "0");
  const dataPadded = innerData.padEnd(Math.ceil(innerData.length / 64) * 64, "0");
  return "0x" + selector + targetHex + valueHex + dataOffset + dataLen + dataPadded;
}

function buildInitCode(factoryAddress: string, _sender: string): string {
  // Simple factory initCode — in production supply real factory calldata
  return factoryAddress + randomBytes(32).toString("hex");
}

function hashUserOperation(sender: string, callData: string): string {
  return "0x" + createHash("sha256")
    .update(sender + callData + Date.now().toString())
    .digest("hex");
}
