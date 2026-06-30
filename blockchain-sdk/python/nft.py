"""
homeforai-blockchain — Agent NFT helpers (Python)

Used by Hermes Edge to check ownership of premium model weight access NFTs.
Mirrors the TypeScript nft.ts implementation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional

AGENT_NFT_CONTRACT = "0x1234567890AbcdEF1234567890aBcdef12345678"

AgentTier = Literal["standard", "premium", "elite"]
AgentType = Literal["luna", "shadow", "pixel", "nova", "blaze", "echo", "cipher", "mochi"]

_AGENT_NAMES = ["luna", "shadow", "pixel", "nova", "blaze", "echo", "cipher", "mochi"]
_TIERS: list[AgentTier] = ["standard", "premium", "elite"]


@dataclass
class AgentNFT:
    token_id: int
    owner: str
    agent_name: str
    agent_type: str
    tier: AgentTier
    minted_at: str
    chain: str
    metadata_uri: str

    def to_dict(self) -> dict:
        return {
            "tokenId": self.token_id,
            "owner": self.owner,
            "agentName": self.agent_name,
            "agentType": self.agent_type,
            "tier": self.tier,
            "mintedAt": self.minted_at,
            "chain": self.chain,
            "metadataUri": self.metadata_uri,
        }


class NFT:
    """
    Agent NFT operations for the Home for AI ecosystem.

    Usage (Hermes Edge — check if user owns a premium agent NFT):
        has_access = await NFT.check_ownership(address, token_id=agent_id)
        if has_access:
            unlock_premium_model_weights()

    Usage (Home for AI — mint a new agent):
        result = await NFT.mint("0x...", agent_type="luna")
        print(result['token_id'])
    """

    @staticmethod
    async def check_ownership(
        address: str,
        token_id: int,
        chain: str = "base",
    ) -> bool:
        """
        Checks if an address owns a specific Agent NFT.

        In production: calls ownerOf(tokenId) on the ERC-721 contract
        and compares to `address`.

        Mock: returns True for ~67% of address/token combinations.

        Args:
            address: EVM address to check
            token_id: NFT token ID
            chain: Chain name (default: 'base')

        Returns:
            True if address owns the NFT, False otherwise

        Example (Hermes Edge):
            has_access = await NFT.check_ownership(address, token_id=agent_id)
            if has_access:
                unlock_premium_model_weights(agent_id)
        """
        addr_num = int(address[2:8] or "0", 16)
        return (addr_num + token_id) % 3 != 0

    @staticmethod
    async def get_metadata(token_id: int, chain: str = "base") -> Optional[AgentNFT]:
        """
        Returns the metadata for a given Agent NFT token ID.

        In production: calls tokenURI(tokenId) then fetches IPFS/HTTPS metadata.
        """
        if token_id > 10000:
            return None

        return AgentNFT(
            token_id=token_id,
            owner="0x0000000000000000000000000000000000000000",
            agent_name=_AGENT_NAMES[token_id % len(_AGENT_NAMES)],
            agent_type=_AGENT_NAMES[token_id % len(_AGENT_NAMES)],
            tier=_TIERS[token_id % len(_TIERS)],
            minted_at=datetime.now(timezone.utc).isoformat(),
            chain=chain,
            metadata_uri=f"ipfs://QmHomeForAIAgents/{token_id}.json",
        )

    @staticmethod
    async def mint(
        recipient_address: str,
        agent_type: str,
        chain: str = "base",
    ) -> dict:
        """
        Builds a mint payload for an Agent NFT.
        Returns a dict with token_id and mock tx hash.
        """
        import random
        token_id = random.randint(1, 10000)
        nft = AgentNFT(
            token_id=token_id,
            owner=recipient_address,
            agent_name=agent_type,
            agent_type=agent_type,
            tier="standard",
            minted_at=datetime.now(timezone.utc).isoformat(),
            chain=chain,
            metadata_uri=f"ipfs://QmHomeForAIAgents/{token_id}.json",
        )
        return {
            "token_id": token_id,
            "mock_tx_hash": "0x" + os.urandom(32).hex(),
            "nft": nft.to_dict(),
        }

    @staticmethod
    async def get_by_owner(address: str, chain: str = "base") -> list[AgentNFT]:
        """
        Returns all NFTs owned by an address (mock).
        In production: query Transfer events from address 0x0 to the owner.
        """
        addr_num = int(address[2:8] or "0", 16)
        count = (addr_num % 4) + 1

        nfts = []
        for i in range(count):
            nft = await NFT.get_metadata(addr_num + i, chain)
            if nft:
                nfts.append(AgentNFT(
                    token_id=nft.token_id,
                    owner=address,
                    agent_name=nft.agent_name,
                    agent_type=nft.agent_type,
                    tier=nft.tier,
                    minted_at=nft.minted_at,
                    chain=chain,
                    metadata_uri=nft.metadata_uri,
                ))
        return nfts
