# Cross-App Payment Flow

This document describes how USDC micropayments flow between Home for AI ecosystem apps using EIP-4337 Account Abstraction on Base.

---

## Overview

```
User (Home for AI wallet)
    │
    │  payForCompute(0.50, "raven-ai", userId)
    ▼
EIP-4337 UserOperation (Base chain)
    │
    │  Submit to Bundler (Pimlico / Alchemy AA)
    ▼
EntryPoint contract (0x0000000071727De22E5E9d8BAf0edAc6f37da032)
    │
    │  Executes smart account's execute(usdcAddress, 0, transfer(ravenReceiver, 500000))
    ▼
USDC contract on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
    │
    │  Transfer(from=userSmartAccount, to=ravenReceiver, amount=500000)
    ▼
Raven AI treasury wallet
    │
    │  verifyPayment(txHash) → true
    ▼
Raven AI unlocks premium compute for user
```

---

## Step-by-Step Flow

### Step 1: User initiates a cross-app payment in Home for AI

```typescript
// client/src/pages/Workshop.tsx or similar
import { payForCompute } from '@homeforai/blockchain-sdk';

const payment = await payForCompute({
  amount: 0.50,           // $0.50 USDC
  targetApp: 'raven-ai',
  userId: user.id,
  chain: 'base',
});
```

This creates an unsigned `UserOperation` — an EIP-4337 transaction that:
- Calls `execute()` on the user's smart account
- Which calls `transfer()` on the USDC contract
- Sending 500,000 USDC units (0.50 USDC, 6 decimals) to Raven AI's treasury

---

### Step 2: Sign the UserOperation

```typescript
// Sign with the user's smart account key (secp256k1 ECDSA)
import { signWithDID } from '@homeforai/blockchain-sdk';

const signedOp = {
  ...payment.userOperation,
  signature: signWithDID(user.did, user.encryptedPrivateKey, payment.userOperation, encryptKey),
};
```

---

### Step 3: Submit to Bundler

```typescript
// Submit to a bundler (Pimlico, Alchemy, etc.)
const txHash = await bundler.sendUserOperation({
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  userOperation: signedOp,
});
```

The bundler:
1. Validates the UserOperation
2. Simulates it against the EntryPoint
3. Submits it as a regular Ethereum transaction in a batch
4. Returns the transaction hash once included in a block

---

### Step 4: Raven AI verifies payment

The Home for AI frontend passes the `txHash` to the Raven AI API:

```python
# Raven AI FastAPI backend
from homeforai_blockchain import verify_payment

@router.post("/pipeline")
async def run_pipeline(request: PipelineRequest, x_payment_hash: str = Header()):
    result = await verify_payment(x_payment_hash, chain="base")
    if not result["verified"]:
        raise HTTPException(402, "Payment required")
    
    # Proceed with compute
    return await execute_pipeline(request.query)
```

---

## Supported Payment Routes

| From | To | Amount | Use Case |
|------|----|--------|----------|
| Home for AI | Raven AI | 0.10–5.00 USDC | Research pipeline execution |
| Home for AI | OpenClinical AI | 0.25–10.00 USDC | Clinical AI inference |
| Home for AI | Hermes Edge | 0.05–2.00 USDC | Premium model weight access |
| Raven AI | Hermes Edge | 0.10–1.00 USDC | Sub-model requests |

---

## Gas Cost Estimates (Base chain)

| Operation | Gas | Cost (at 0.001 gwei) |
|-----------|-----|----------------------|
| USDC transfer via smart account | ~120,000 | ~$0.0001 |
| NFT ownership check | read-only | free |
| Bundler fee (Pimlico) | included | ~$0.0005 |
| **Total** | | **~$0.001 per payment** |

Base is the recommended chain for all cross-app payments due to its very low gas costs and fast finality (~2 second block time).

---

## Payment Request URI (QR Code)

To generate a QR code for cross-app payments:

```typescript
import { buildPaymentRequestUri } from '@homeforai/blockchain-sdk';

const uri = buildPaymentRequestUri('raven-ai', 0.50, userId, 'base');
// ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0xBadDB0b8...&uint256=500000&label=raven-ai&memo=user_123

// Generate QR code from this URI
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(uri);
```

---

## Error Handling

```typescript
try {
  const payment = await payForCompute({ amount: 0.50, targetApp: 'raven-ai', userId });
  const txHash = await submitTobundler(payment.userOperation);
  const verified = await verifyPayment(txHash);
  
  if (!verified.verified) {
    throw new Error(`Payment not confirmed: ${txHash}`);
  }
} catch (err) {
  if (err.message.includes('insufficient funds')) {
    // Show "Top up your wallet" UI
  } else if (err.message.includes('bundler')) {
    // Retry with different bundler
  }
}
```

---

## Future: HOMEAI Token Payments

The HOMEAI utility token (ERC-20 on Base) will offer a 10% discount on all cross-app payments:

```typescript
import { computeHomeAIPaymentAmount } from '@homeforai/blockchain-sdk';

const { homeaiAmount, discountPercent, savingsUsd } = computeHomeAIPaymentAmount(
  0.50,   // USDC amount
  0.01,   // HOMEAI price in USD
);
// homeaiAmount: "45.00" HOMEAI (10% discount applied)
// discountPercent: 10
// savingsUsd: 0.05
```

---

## References

- [EIP-4337: Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Base Chain Documentation](https://docs.base.org)
- [Pimlico Bundler](https://docs.pimlico.io)
- [USDC on Base](https://www.circle.com/blog/usdc-now-available-natively-on-base)
- [W3C DID Core Spec](https://www.w3.org/TR/did-core/)
