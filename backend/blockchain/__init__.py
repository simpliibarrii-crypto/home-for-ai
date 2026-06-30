"""
blockchain — Home for AI blockchain integration layer.

Provides:
  - chains.py        Chain registry dataclass for all 8 supported networks
  - eip4337.py       EIP-4337 UserOperation builder + eth_account signing
  - converter.py     CryptoToFiat (CoinGecko), FiatToBond, FiatToCommodity
  - wallet_manager.py  BIP-39 → BIP-32 → BIP-44 HD wallet derivation
  - nft.py           ERC-721/ERC-1155 stub for future agent NFT skills
"""

from .chains import Chain, ChainRegistry, CHAINS, get_chain
from .converter import CryptoToFiatConverter, FiatToBondConverter, FiatToCommodityConverter
from .eip4337 import UserOperation, UserOpBuilder
from .wallet_manager import HDWalletManager

__all__ = [
    "Chain",
    "ChainRegistry",
    "CHAINS",
    "get_chain",
    "CryptoToFiatConverter",
    "FiatToBondConverter",
    "FiatToCommodityConverter",
    "UserOperation",
    "UserOpBuilder",
    "HDWalletManager",
]
