/**
 * @homeforai/blockchain-sdk — Agent NFT
 *
 * ERC-721 NFTs represent AI agents in the Home for AI ecosystem.
 * Used by Hermes Edge to gate access to premium model weights.
 *
 * Contract: HomeForAI Agent NFT (ERC-721)
 * Deployed on Base: placeholder address (deploy via Foundry/Hardhat)
 */

import { CHAINS, ChainKey } from "./chains";
import { buildUserOperation, encodeSmartAccountExecute, UserOperation } from "./eip4337";
import { randomBytes } from "node:crypto";

/** Placeholder contract address — replace with deployed contract */
export const AGENT_NFT_CONTRACT = "0x1234567890AbcdEF1234567890aBcdef12345678";

export interface AgentNFT {
  tokenId: number;
  owner: string;
  agentName: string;
  agentType: "luna" | "shadow" | "pixel" | "nova" | "blaze" | "echo" | "cipher" | "mochi" | string;
  tier: "standard" | "premium" | "elite";
  mintedAt: string;
  chain: ChainKey;
  metadataUri: string;
}

export interface MintResult {
  userOperation: UserOperation;
  mockTxHash: string;
  tokenId: number;
  nft: AgentNFT;
}

/**
 * ERC-721 function selectors:
 * - ownerOf(uint256):   0x6352211e
 * - mint(address,uint256): 0x40c10f19  (custom mint)
 * - transferFrom(address,address,uint256): 0x23b872dd
 */

/**
 * Checks if an address owns a specific Agent NFT token.
 *
 * In production: calls eth_call on ownerOf(tokenId) and compares to address.
 * Mock: returns true for token IDs < 1000 (demo).
 */
export async function checkOwnership(
  address: string,
  tokenId: number,
  chain: ChainKey = "base"
): Promise<boolean> {
  // Mock: simulate ownership for demonstration
  const addrNum = parseInt(address.slice(2, 8) || "0", 16);
  return (addrNum + tokenId) % 3 !== 0; // ~67% chance of ownership in demo
}

/**
 * Returns the AgentNFT metadata for a given token ID.
 *
 * In production: calls tokenURI(tokenId) then fetches IPFS/HTTPS metadata.
 */
export async function getNFTMetadata(
  tokenId: number,
  chain: ChainKey = "base"
): Promise<AgentNFT | null> {
  const agentNames = ["luna", "shadow", "pixel", "nova", "blaze", "echo", "cipher", "mochi"];
  const tiers: AgentNFT["tier"][] = ["standard", "premium", "elite"];

  if (tokenId > 10000) return null;

  return {
    tokenId,
    owner: "0x0000000000000000000000000000000000000000", // unknown in mock
    agentName: agentNames[tokenId % agentNames.length],
    agentType: agentNames[tokenId % agentNames.length],
    tier: tiers[tokenId % tiers.length],
    mintedAt: new Date(Date.now() - tokenId * 86400000).toISOString(),
    chain,
    metadataUri: `ipfs://QmHomeForAIAgents/${tokenId}.json`,
  };
}

/**
 * Builds a UserOperation to mint an Agent NFT.
 *
 * @param recipientAddress - Address to receive the NFT
 * @param agentType - Agent type to mint
 * @param senderAddress - Smart account address
 * @param chain - Chain to mint on (default: base)
 */
export async function mintAgentNFT(
  recipientAddress: string,
  agentType: string,
  senderAddress: string,
  chain: ChainKey = "base"
): Promise<MintResult> {
  const tokenId = Math.floor(Math.random() * 10000);

  // Encode mint(address,uint256) call
  const mintSelector = "40c10f19";
  const recipientHex = recipientAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const tokenIdHex = tokenId.toString(16).padStart(64, "0");
  const mintCallData = "0x" + mintSelector + recipientHex + tokenIdHex;

  const callData = encodeSmartAccountExecute(AGENT_NFT_CONTRACT, BigInt(0), mintCallData);

  const userOp = buildUserOperation({
    sender: senderAddress,
    callData,
    chain,
  });

  const nft: AgentNFT = {
    tokenId,
    owner: recipientAddress,
    agentName: agentType,
    agentType,
    tier: "standard",
    mintedAt: new Date().toISOString(),
    chain,
    metadataUri: `ipfs://QmHomeForAIAgents/${tokenId}.json`,
  };

  return {
    userOperation: userOp,
    mockTxHash: "0x" + randomBytes(32).toString("hex"),
    tokenId,
    nft,
  };
}

/**
 * Builds a UserOperation to transfer an Agent NFT to another address.
 */
export async function transferAgentNFT(
  fromAddress: string,
  toAddress: string,
  tokenId: number,
  chain: ChainKey = "base"
): Promise<UserOperation> {
  // transferFrom(address,address,uint256): 0x23b872dd
  const selector = "23b872dd";
  const fromHex = fromAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const toHex = toAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const tokenIdHex = tokenId.toString(16).padStart(64, "0");
  const transferCallData = "0x" + selector + fromHex + toHex + tokenIdHex;

  const callData = encodeSmartAccountExecute(AGENT_NFT_CONTRACT, BigInt(0), transferCallData);

  return buildUserOperation({
    sender: fromAddress,
    callData,
    chain,
  });
}

/**
 * Returns all NFTs owned by an address.
 * In production: query ERC-721 Transfer events from address 0x0 to the owner.
 * Mock: generates demo NFTs.
 */
export async function getNFTsByOwner(
  address: string,
  chain: ChainKey = "base"
): Promise<AgentNFT[]> {
  const addrNum = parseInt(address.slice(2, 8) || "0", 16);
  const count = (addrNum % 4) + 1; // 1-4 NFTs
  const nfts: AgentNFT[] = [];

  for (let i = 0; i < count; i++) {
    const nft = await getNFTMetadata(addrNum + i, chain);
    if (nft) {
      nfts.push({ ...nft, owner: address });
    }
  }
  return nfts;
}
