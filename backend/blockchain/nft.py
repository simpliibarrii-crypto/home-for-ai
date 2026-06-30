"""
nft.py — ERC-721/ERC-1155 stub for future agent NFT skills.

Provides:
  - ERC-721 and ERC-1155 ABI stubs
  - NFTMetadata dataclass (OpenSea-compatible schema)
  - AgentNFT: planned NFT structure for agent skill-based NFTs
  - Mint / transfer / query stubs ready for web3.py integration

All methods are async and designed for non-blocking use inside FastAPI.
"""

from __future__ import annotations

import uuid
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional


# ─── Token standard enum ──────────────────────────────────────────────────────

class NFTStandard(str, Enum):
    ERC721  = "ERC721"   # unique, non-fungible
    ERC1155 = "ERC1155"  # multi-token, semi-fungible


# ─── Metadata schema (OpenSea-compatible) ─────────────────────────────────────

@dataclass
class NFTAttribute:
    """A single trait attribute in the OpenSea metadata schema."""
    trait_type: str
    value: str | int | float
    display_type: Optional[str] = None  # "number", "boost_number", "date", etc.


@dataclass
class NFTMetadata:
    """
    ERC-721/1155 metadata JSON schema (OpenSea-compatible).

    Upload to IPFS or Arweave and set tokenURI to the content hash.
    """
    name: str
    description: str
    image: str                        # IPFS URI: ipfs://<CID>
    external_url: Optional[str] = None
    animation_url: Optional[str] = None
    background_color: str = "000000"  # 6-char hex without #
    attributes: list[NFTAttribute] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "image": self.image,
            "external_url": self.external_url,
            "animation_url": self.animation_url,
            "background_color": self.background_color,
            "attributes": [asdict(a) for a in self.attributes],
        }


# ─── Agent NFT schema ─────────────────────────────────────────────────────────

class AgentSkillTier(str, Enum):
    BRONZE   = "Bronze"
    SILVER   = "Silver"
    GOLD     = "Gold"
    PLATINUM = "Platinum"
    DIAMOND  = "Diamond"


@dataclass
class AgentNFT:
    """
    Planned ERC-721 NFT for an AI agent skill certification.

    Each agent can earn skill NFTs for reaching performance thresholds.
    The NFT is soulbound (non-transferable) to the agent's smart wallet.
    """
    agent_id: str
    agent_name: str
    skill_type: str               # e.g. "trading", "risk", "analysis"
    tier: AgentSkillTier
    contract_address: str         # ERC-721 contract
    token_id: Optional[int] = None
    chain_id: int = 1
    owner_address: Optional[str] = None
    minted_at: Optional[float] = None
    metadata_uri: Optional[str] = None

    def to_metadata(self) -> NFTMetadata:
        """Convert to OpenSea-compatible metadata."""
        return NFTMetadata(
            name=f"{self.agent_name} — {self.skill_type.title()} [{self.tier.value}]",
            description=(
                f"This NFT certifies that {self.agent_name} has achieved "
                f"{self.tier.value} tier in {self.skill_type} skills on the "
                f"Home for AI platform."
            ),
            image=f"ipfs://QmPlaceholder/{self.skill_type}/{self.tier.value.lower()}.png",
            external_url=f"https://homeforai.com/agents/{self.agent_id}",
            attributes=[
                NFTAttribute("Agent ID", self.agent_id),
                NFTAttribute("Skill Type", self.skill_type.title()),
                NFTAttribute("Tier", self.tier.value),
                NFTAttribute("Chain ID", self.chain_id, display_type="number"),
            ],
        )


# ─── ERC-721 ABI stub ─────────────────────────────────────────────────────────

ERC721_ABI = [
    {"inputs": [{"name": "to", "type": "address"}, {"name": "tokenId", "type": "uint256"}],
     "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},

    {"inputs": [{"name": "tokenId", "type": "uint256"}],
     "name": "ownerOf", "outputs": [{"name": "", "type": "address"}],
     "stateMutability": "view", "type": "function"},

    {"inputs": [{"name": "from", "type": "address"}, {"name": "to", "type": "address"},
                {"name": "tokenId", "type": "uint256"}],
     "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function"},

    {"inputs": [{"name": "tokenId", "type": "uint256"}],
     "name": "tokenURI", "outputs": [{"name": "", "type": "string"}],
     "stateMutability": "view", "type": "function"},

    {"inputs": [{"name": "owner", "type": "address"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view", "type": "function"},

    # ERC-721 events
    {"anonymous": False,
     "inputs": [{"indexed": True, "name": "from", "type": "address"},
                {"indexed": True, "name": "to", "type": "address"},
                {"indexed": True, "name": "tokenId", "type": "uint256"}],
     "name": "Transfer", "type": "event"},
]


# ─── ERC-1155 ABI stub ────────────────────────────────────────────────────────

ERC1155_ABI = [
    {"inputs": [{"name": "to", "type": "address"}, {"name": "id", "type": "uint256"},
                {"name": "amount", "type": "uint256"}, {"name": "data", "type": "bytes"}],
     "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},

    {"inputs": [{"name": "account", "type": "address"}, {"name": "id", "type": "uint256"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view", "type": "function"},

    {"inputs": [{"name": "from", "type": "address"}, {"name": "to", "type": "address"},
                {"name": "id", "type": "uint256"}, {"name": "amount", "type": "uint256"},
                {"name": "data", "type": "bytes"}],
     "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function"},

    {"inputs": [{"name": "id", "type": "uint256"}],
     "name": "uri", "outputs": [{"name": "", "type": "string"}],
     "stateMutability": "view", "type": "function"},

    # ERC-1155 events
    {"anonymous": False,
     "inputs": [{"indexed": True, "name": "operator", "type": "address"},
                {"indexed": True, "name": "from", "type": "address"},
                {"indexed": True, "name": "to", "type": "address"},
                {"indexed": False, "name": "id", "type": "uint256"},
                {"indexed": False, "name": "value", "type": "uint256"}],
     "name": "TransferSingle", "type": "event"},
]


# ─── NFT Client (stub) ────────────────────────────────────────────────────────

class NFTClient:
    """
    Stub NFT client for interacting with ERC-721/1155 contracts via web3.py.

    Production: instantiate with a web3.py Web3 instance and contract address.
    """

    def __init__(
        self,
        contract_address: str,
        standard: NFTStandard,
        chain_id: int = 1,
    ) -> None:
        self.contract_address = contract_address
        self.standard = standard
        self.chain_id = chain_id
        # In production: self._contract = web3.eth.contract(address, abi=ERC721_ABI)

    async def mint(
        self,
        to_address: str,
        token_id: int,
        metadata_uri: str,
        amount: int = 1,
    ) -> dict:
        """Stub mint — returns a mock transaction receipt."""
        return {
            "tx_hash": "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:32],
            "contract": self.contract_address,
            "to": to_address,
            "token_id": token_id,
            "amount": amount,
            "metadata_uri": metadata_uri,
            "standard": self.standard.value,
            "chain_id": self.chain_id,
            "status": "minted",
            "minted_at": time.time(),
        }

    async def get_owner(self, token_id: int) -> str:
        """Stub ownerOf / balanceOf query — returns a mock address."""
        return "0x0000000000000000000000000000000000000001"

    async def get_token_uri(self, token_id: int) -> str:
        """Stub tokenURI query."""
        return f"ipfs://QmPlaceholder/{self.contract_address[2:10]}/{token_id}"

    async def transfer(
        self,
        from_address: str,
        to_address: str,
        token_id: int,
        private_key: str,
    ) -> dict:
        """Stub transfer — in production builds and signs an ERC-721 transferFrom tx."""
        return {
            "tx_hash": "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:32],
            "from": from_address,
            "to": to_address,
            "token_id": token_id,
            "status": "transferred",
        }

    async def mint_agent_nft(
        self,
        agent: AgentNFT,
        private_key: str,
    ) -> AgentNFT:
        """
        Mint an agent skill NFT.

        1. Upload metadata JSON to IPFS (stub)
        2. Call ERC-721 mint(owner_address, next_token_id)
        3. Return updated AgentNFT with token_id and minted_at
        """
        token_id = int(uuid.uuid4().hex[:8], 16)
        metadata = agent.to_metadata()
        metadata_uri = f"ipfs://QmStubCID{token_id}"

        await self.mint(
            to_address=agent.owner_address or "0x0000000000000000000000000000000000000001",
            token_id=token_id,
            metadata_uri=metadata_uri,
        )

        return AgentNFT(
            agent_id=agent.agent_id,
            agent_name=agent.agent_name,
            skill_type=agent.skill_type,
            tier=agent.tier,
            contract_address=self.contract_address,
            token_id=token_id,
            chain_id=self.chain_id,
            owner_address=agent.owner_address,
            minted_at=time.time(),
            metadata_uri=metadata_uri,
        )
