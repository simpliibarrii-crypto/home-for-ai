"""
homeforai-blockchain — Chain Registry (Python)

Mirrors the TypeScript chains.ts implementation.
All 8 chains used across the Home for AI ecosystem.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ChainConfig:
    chain_id: int
    name: str
    rpc: str
    explorer: str
    usdc: str
    symbol: str


CHAINS: dict[str, ChainConfig] = {
    "ethereum": ChainConfig(
        chain_id=1,
        name="Ethereum",
        rpc="https://eth.llamarpc.com",
        explorer="https://etherscan.io",
        usdc="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol="ETH",
    ),
    "polygon": ChainConfig(
        chain_id=137,
        name="Polygon",
        rpc="https://polygon.llamarpc.com",
        explorer="https://polygonscan.com",
        usdc="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        symbol="MATIC",
    ),
    "arbitrum": ChainConfig(
        chain_id=42161,
        name="Arbitrum One",
        rpc="https://arb1.arbitrum.io/rpc",
        explorer="https://arbiscan.io",
        usdc="0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        symbol="ETH",
    ),
    "base": ChainConfig(
        chain_id=8453,
        name="Base",
        rpc="https://mainnet.base.org",
        explorer="https://basescan.org",
        usdc="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        symbol="ETH",
    ),
    "bsc": ChainConfig(
        chain_id=56,
        name="BNB Chain",
        rpc="https://bsc-dataseed.binance.org",
        explorer="https://bscscan.com",
        usdc="0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        symbol="BNB",
    ),
    "avalanche": ChainConfig(
        chain_id=43114,
        name="Avalanche",
        rpc="https://api.avax.network/ext/bc/C/rpc",
        explorer="https://snowtrace.io",
        usdc="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        symbol="AVAX",
    ),
    "optimism": ChainConfig(
        chain_id=10,
        name="Optimism",
        rpc="https://mainnet.optimism.io",
        explorer="https://optimistic.etherscan.io",
        usdc="0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        symbol="ETH",
    ),
    "solana": ChainConfig(
        chain_id=1151111081099592,
        name="Solana",
        rpc="https://api.mainnet-beta.solana.com",
        explorer="https://solscan.io",
        usdc="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol="SOL",
    ),
}


def get_chain_by_id(chain_id: int) -> Optional[ChainConfig]:
    """Returns chain config for the given chainId, or None."""
    return next((c for c in CHAINS.values() if c.chain_id == chain_id), None)


def get_evm_chains() -> list[ChainConfig]:
    """Returns all EVM-compatible chains (excludes Solana)."""
    return [c for key, c in CHAINS.items() if key != "solana"]
