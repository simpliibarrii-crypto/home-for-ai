# @homeforai/blockchain-sdk

Shared blockchain identity and payment SDK for the Home for AI ecosystem.

Used by all four Barry Clerjuste applications:
- **Home for AI** — wallet creation, user identity, UI
- **Raven AI** — research compute payment verification
- **OpenClinical AI** — clinical AI inference payment verification
- **Hermes Edge** — premium model weight access via NFT or payment

---

## What It Does

Every app shares the same blockchain identity layer. A user who creates a wallet in Home for AI can use that same wallet identity to:
- Pay for research compute in **Raven AI** (0.50 USDC per pipeline)
- Pay for clinical AI inference in **OpenClinical AI** (variable)
- Unlock premium model weights in **Hermes Edge** (via Agent NFT or payment)

Payments happen on **Base chain** via **EIP-4337 Account Abstraction** — low gas (~$0.001), fast finality (~2 seconds).

---

## Installation

```bash
# TypeScript / Node.js
npm install @homeforai/blockchain-sdk

# Python
pip install homeforai-blockchain
```

---

## Quick Start (TypeScript)

```typescript
import {
  generateMnemonic,
  walletFromMnemonic,
  createDID,
  payForCompute,
  verifyPayment,
  checkOwnership,
} from '@homeforai/blockchain-sdk';

// 1. Create a wallet
const mnemonic = generateMnemonic();
const wallet = await walletFromMnemonic(mnemonic, 'evm', 0);
console.log('Address:', wallet.address);

// 2. Create a DID
const did = createDID(wallet.address);
console.log('DID:', did);
// → did:ethr:0x742d35cc6634c0532925a3b844bc454e4438f44e

// 3. Pay for Raven AI compute
const payment = await payForCompute({
  amount: 0.50,
  targetApp: 'raven-ai',
  userId: user.id,
});

// 4. Verify the payment was confirmed
const { verified } = await verifyPayment(payment.mockTxHash);
```

---

## Quick Start (Python)

```python
from homeforai_blockchain import Wallet, DID, NFT, verify_payment, pay_for_compute
import asyncio

async def main():
    # Create a wallet
    wallet = Wallet.generate()
    print(wallet.address)
    
    # Create a DID
    did = DID.create(wallet.address)
    print(did)  # did:ethr:0x...
    
    # Check NFT ownership (Hermes Edge)
    has_access = await NFT.check_ownership(wallet.address, token_id=42)
    
    # Pay for compute (Raven AI)
    payment = await pay_for_compute(
        amount=0.50,
        target_app="raven-ai",
        user_id="user_123",
    )
    
    # Verify payment
    result = await verify_payment(payment["mock_tx_hash"], chain="base")
    print("Verified:", result["verified"])

asyncio.run(main())
```

---

## Supported Chains

| Chain | Chain ID | USDC Address |
|-------|----------|--------------|
| Ethereum | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Polygon | 137 | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Arbitrum One | 42161 | `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8` |
| **Base** ⭐ | **8453** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| BNB Chain | 56 | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| Avalanche | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| Optimism | 10 | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| Solana | — | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

⭐ Base is recommended for all cross-app payments (~$0.001 gas, 2s finality).

---

## Package Structure

```
homeforai-blockchain-sdk/
  src/
    index.ts        Main TypeScript exports
    wallet.ts       BIP-39/BIP-44 HD wallet
    identity.ts     W3C DID:ethr
    chains.ts       8-chain registry
    eip4337.ts      UserOperation builder
    payments.ts     Cross-app micropayment protocol
    nft.ts          Agent NFT operations
    token.ts        HOMEAI ERC-20 token
    crypto.ts       AES-256-GCM encryption
  python/
    wallet.py       Python BIP-44 wallet
    identity.py     W3C DID:ethr for Python
    chains.py       Chain registry dataclass
    payments.py     Async payment protocol
    nft.py          Agent NFT helpers
  tests/
    test_wallet.ts
    test_payments.ts
  docs/
    INTEGRATION.md
    CROSS_APP_PAYMENTS.md
```

---

## Documentation

- [Integration Guide](docs/INTEGRATION.md) — per-app setup instructions
- [Cross-App Payments](docs/CROSS_APP_PAYMENTS.md) — payment flow deep dive

---

## License

Apache-2.0 — Barry Clerjuste / Home for AI, 2026
