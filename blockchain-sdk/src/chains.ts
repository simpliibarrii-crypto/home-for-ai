/**
 * @homeforai/blockchain-sdk — Chain Registry
 * Supports 8 chains used across all Barry Clerjuste apps.
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  usdc: string;
  symbol: string;
}

export const CHAINS = {
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    rpc: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "ETH",
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpc: "https://polygon.llamarpc.com",
    explorer: "https://polygonscan.com",
    usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    symbol: "MATIC",
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    usdc: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    symbol: "ETH",
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "ETH",
  },
  bsc: {
    chainId: 56,
    name: "BNB Chain",
    rpc: "https://bsc-dataseed.binance.org",
    explorer: "https://bscscan.com",
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    symbol: "BNB",
  },
  avalanche: {
    chainId: 43114,
    name: "Avalanche",
    rpc: "https://api.avax.network/ext/bc/C/rpc",
    explorer: "https://snowtrace.io",
    usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    symbol: "AVAX",
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    symbol: "ETH",
  },
  solana: {
    chainId: 1151111081099592,
    name: "Solana",
    rpc: "https://api.mainnet-beta.solana.com",
    explorer: "https://solscan.io",
    usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "SOL",
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

/** Returns chain config by chainId, or undefined if not found. */
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((c) => c.chainId === chainId);
}

/** Returns all EVM-compatible chains (excludes Solana). */
export function getEvmChains(): ChainConfig[] {
  return Object.values(CHAINS).filter((c) => c.chainId !== CHAINS.solana.chainId);
}
