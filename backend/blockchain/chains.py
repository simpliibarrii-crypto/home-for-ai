"""
chains.py — Chain registry for all supported EVM and non-EVM networks.

Dataclasses provide strong typing and are JSON-serialisable via dataclasses.asdict().
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass(frozen=True)
class NativeCurrency:
    name: str
    symbol: str
    decimals: int


@dataclass(frozen=True)
class Chain:
    """Full configuration for a blockchain network."""

    chain_id: int
    name: str
    short_name: str
    network_type: str  # "evm" | "svm"
    rpc_url: str
    explorer_url: str
    native_currency: NativeCurrency
    usdc_address: str  # ERC-20 / SPL USDC contract
    is_evm: bool
    block_time_ms: int
    finalization_blocks: int
    ws_url: Optional[str] = None
    entry_point_addr: Optional[str] = None  # EIP-4337 EntryPoint
    bundler_url: Optional[str] = None       # EIP-4337 bundler RPC
    is_testnet: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def eip1559_supported(self) -> bool:
        """Returns True for chains that support EIP-1559 fee market."""
        # Arbitrum, Base, Optimism use L2 gas model but accept EIP-1559 format
        return self.is_evm and self.chain_id not in {56}  # BSC still uses legacy


# ─── Chain definitions ────────────────────────────────────────────────────────

ETHEREUM = Chain(
    chain_id=1,
    name="Ethereum",
    short_name="eth",
    network_type="evm",
    rpc_url="https://eth.llamarpc.com",
    ws_url="wss://eth.llamarpc.com",
    explorer_url="https://etherscan.io",
    native_currency=NativeCurrency("Ether", "ETH", 18),
    usdc_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/ethereum-mainnet",
    is_evm=True,
    block_time_ms=12000,
    finalization_blocks=64,
)

POLYGON = Chain(
    chain_id=137,
    name="Polygon",
    short_name="matic",
    network_type="evm",
    rpc_url="https://polygon.llamarpc.com",
    ws_url="wss://polygon.llamarpc.com",
    explorer_url="https://polygonscan.com",
    native_currency=NativeCurrency("MATIC", "MATIC", 18),
    usdc_address="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/polygon",
    is_evm=True,
    block_time_ms=2000,
    finalization_blocks=256,
)

ARBITRUM = Chain(
    chain_id=42161,
    name="Arbitrum One",
    short_name="arb1",
    network_type="evm",
    rpc_url="https://arbitrum.llamarpc.com",
    ws_url="wss://arbitrum.llamarpc.com",
    explorer_url="https://arbiscan.io",
    native_currency=NativeCurrency("Ether", "ETH", 18),
    usdc_address="0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/arbitrum",
    is_evm=True,
    block_time_ms=250,
    finalization_blocks=1,
)

BASE = Chain(
    chain_id=8453,
    name="Base",
    short_name="base",
    network_type="evm",
    rpc_url="https://base.llamarpc.com",
    ws_url="wss://base.llamarpc.com",
    explorer_url="https://basescan.org",
    native_currency=NativeCurrency("Ether", "ETH", 18),
    usdc_address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/base",
    is_evm=True,
    block_time_ms=2000,
    finalization_blocks=1,
)

BSC = Chain(
    chain_id=56,
    name="BNB Smart Chain",
    short_name="bnb",
    network_type="evm",
    rpc_url="https://bsc.publicnode.com",
    ws_url="wss://bsc.publicnode.com",
    explorer_url="https://bscscan.com",
    native_currency=NativeCurrency("BNB", "BNB", 18),
    usdc_address="0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/bsc",
    is_evm=True,
    block_time_ms=3000,
    finalization_blocks=15,
)

AVALANCHE = Chain(
    chain_id=43114,
    name="Avalanche C-Chain",
    short_name="avax",
    network_type="evm",
    rpc_url="https://avalanche.publicnode.com/ext/bc/C/rpc",
    ws_url="wss://avalanche.publicnode.com/ext/bc/C/ws",
    explorer_url="https://snowscan.xyz",
    native_currency=NativeCurrency("Avalanche", "AVAX", 18),
    usdc_address="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/avalanche",
    is_evm=True,
    block_time_ms=2000,
    finalization_blocks=1,
)

OPTIMISM = Chain(
    chain_id=10,
    name="Optimism",
    short_name="oeth",
    network_type="evm",
    rpc_url="https://optimism.llamarpc.com",
    ws_url="wss://optimism.llamarpc.com",
    explorer_url="https://optimistic.etherscan.io",
    native_currency=NativeCurrency("Ether", "ETH", 18),
    usdc_address="0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    entry_point_addr="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    bundler_url="https://api.stackup.sh/v1/node/optimism",
    is_evm=True,
    block_time_ms=2000,
    finalization_blocks=1,
)

SOLANA = Chain(
    chain_id=999999999,  # Pseudo chain ID (Solana mainnet has no EVM chain ID)
    name="Solana",
    short_name="sol",
    network_type="svm",
    rpc_url="https://api.mainnet-beta.solana.com",
    ws_url="wss://api.mainnet-beta.solana.com",
    explorer_url="https://solscan.io",
    native_currency=NativeCurrency("Solana", "SOL", 9),
    usdc_address="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # SPL USDC mint
    is_evm=False,
    block_time_ms=400,
    finalization_blocks=32,
)

# ─── Registry ─────────────────────────────────────────────────────────────────

# All supported chains indexed by chain_id
CHAINS: dict[int, Chain] = {
    c.chain_id: c
    for c in [ETHEREUM, POLYGON, ARBITRUM, BASE, BSC, AVALANCHE, OPTIMISM, SOLANA]
}


class ChainRegistry:
    """Thread-safe registry of supported chains."""

    def __init__(self) -> None:
        self._chains: dict[int, Chain] = dict(CHAINS)

    def get(self, chain_id: int) -> Chain:
        """Return chain config or raise ValueError for unknown chain IDs."""
        chain = self._chains.get(chain_id)
        if chain is None:
            raise ValueError(
                f"Unsupported chain_id: {chain_id}. "
                f"Supported: {sorted(self._chains.keys())}"
            )
        return chain

    def all(self) -> list[Chain]:
        return list(self._chains.values())

    def evm_chains(self) -> list[Chain]:
        return [c for c in self._chains.values() if c.is_evm]

    def get_by_short_name(self, short_name: str) -> Chain:
        for chain in self._chains.values():
            if chain.short_name == short_name:
                return chain
        raise ValueError(f"Unknown chain short name: {short_name!r}")

    def register(self, chain: Chain) -> None:
        """Add a custom chain (e.g. testnet) at runtime."""
        self._chains[chain.chain_id] = chain


def get_chain(chain_id: int) -> Chain:
    """Convenience function — returns a Chain or raises ValueError."""
    return ChainRegistry().get(chain_id)
