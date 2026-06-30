# Integration Guide — @homeforai/blockchain-sdk

This guide explains how each app in the Home for AI ecosystem integrates the shared blockchain SDK.

---

## Installation

### TypeScript / Node.js (Home for AI, Raven AI frontend)

```bash
npm install @homeforai/blockchain-sdk
# or
pnpm add @homeforai/blockchain-sdk
```

### Python (Raven AI, OpenClinical AI, Hermes Edge backends)

```bash
pip install homeforai-blockchain
# or
uv add homeforai-blockchain
```

---

## Home for AI (TypeScript/React)

The main app — user onboarding, wallet creation, and paying other apps.

### Wallet Creation

```typescript
import { generateMnemonic, walletFromMnemonic, createDID } from '@homeforai/blockchain-sdk';

async function onboardUser() {
  // 1. Generate a new 12-word mnemonic
  const mnemonic = generateMnemonic();
  // ⚠️ Show this to the user once and never store plaintext
  
  // 2. Derive the EVM wallet
  const wallet = await walletFromMnemonic(mnemonic, 'evm', 0);
  console.log('Address:', wallet.address);
  // → 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
  
  // 3. Create a Decentralized Identity
  const did = createDID(wallet.address);
  console.log('DID:', did);
  // → did:ethr:0x742d35cc6634c0532925a3b844bc454e4438f44e
  
  // 4. Store the encrypted private key in your DB
  // wallet.encryptedPrivateKey is AES-256-GCM encrypted
  await db.users.update({ encryptedKey: wallet.encryptedPrivateKey, did });
}
```

### Paying for Compute (Raven AI)

```typescript
import { payForCompute, verifyPayment } from '@homeforai/blockchain-sdk';

async function runRavenAIPipeline(userId: string) {
  // 1. Create payment
  const payment = await payForCompute({
    amount: 0.50,       // $0.50 USDC
    targetApp: 'raven-ai',
    userId,
    chain: 'base',     // default, cheapest
  });
  
  // 2. Sign and submit UserOperation to bundler
  // (In production: sign with user's smart account key)
  const txHash = await submitUserOp(payment.userOperation);
  
  // 3. Poll until confirmed
  let verified = false;
  for (let i = 0; i < 10; i++) {
    const result = await verifyPayment(txHash, 'base');
    if (result.verified) { verified = true; break; }
    await sleep(2000);
  }
  
  if (verified) {
    // 4. Call Raven AI API with payment proof
    return fetch('https://api.raven-ai.com/pipeline', {
      method: 'POST',
      headers: { 'X-Payment-Hash': txHash },
      body: JSON.stringify({ query: 'analyze market trends' }),
    });
  }
}
```

### Checking USDC Balance

```typescript
import { getBalance } from '@homeforai/blockchain-sdk';

const balance = await getBalance(user.address, 'base');
console.log(`Balance: ${balance} USDC`);
```

### React hook example

```typescript
import { useQuery } from '@tanstack/react-query';
import { getBalance } from '@homeforai/blockchain-sdk';

function WalletBalance({ address }: { address: string }) {
  const { data: balance } = useQuery({
    queryKey: ['balance', address],
    queryFn: () => getBalance(address, 'base'),
    refetchInterval: 30_000,
  });
  
  return <div className="balance">{balance} USDC</div>;
}
```

---

## Raven AI (Python — research compute backend)

Raven AI is a Python service that processes research queries. It uses the SDK to verify incoming payments before unlocking compute.

### Installation

```bash
pip install homeforai-blockchain
```

### Verifying Payments

```python
from homeforai_blockchain import verify_payment, Wallet

async def handle_research_request(request: Request):
    tx_hash = request.headers.get("X-Payment-Hash")
    
    # 1. Verify the payment was confirmed on-chain
    result = await verify_payment(tx_hash, chain="base")
    if not result["verified"]:
        raise HTTPException(status_code=402, detail="Payment required")
    
    # 2. Unlock compute for the user
    return await run_research_pipeline(request.body)
```

### Creating Outbound Payments (Raven AI → Hermes Edge)

```python
from homeforai_blockchain import pay_for_compute

# Raven AI needs Hermes Edge model weights
async def fetch_premium_model_weights(user_id: str):
    payment = await pay_for_compute(
        amount=0.25,
        target_app="hermes-edge",
        user_id=user_id,
        chain="base",
    )
    # Submit to bundler, then proceed
    return payment["mock_tx_hash"]
```

---

## OpenClinical AI (Python — clinical AI backend)

OpenClinical AI verifies payments before running clinical inference.

```python
from homeforai_blockchain import verify_payment, Wallet, DID

async def handle_clinical_inference(request: ClinicalRequest):
    # 1. Verify payment
    result = await verify_payment(request.payment_tx_hash, chain="base")
    if not result["verified"]:
        return {"error": "Payment verification failed", "code": 402}
    
    # 2. Verify the user's DID
    did_doc = DID.resolve(request.user_did)
    # Check that the payment sender matches the DID address
    
    # 3. Run inference
    return await clinical_model.infer(request.clinical_data)
```

---

## Hermes Edge (Python — model weight distribution)

Hermes Edge gates access to premium model weights using Agent NFTs.

```python
from homeforai_blockchain import NFT, verify_payment

async def serve_model_weights(request: ModelRequest):
    # 1. Check if the user owns a premium Agent NFT
    has_nft = await NFT.check_ownership(
        address=request.user_address,
        token_id=request.agent_id,
        chain="base",
    )
    
    # 2. Alternatively, accept a payment from Raven AI / Home for AI
    if not has_nft:
        payment_result = await verify_payment(request.payment_hash, chain="base")
        if not payment_result["verified"]:
            raise PermissionError("Neither NFT ownership nor valid payment found")
    
    # 3. Serve the model weights
    return await stream_model_weights(request.model_id)
```

---

## Environment Variables

Each app should configure these environment variables:

```env
# Bundler RPC endpoint (Pimlico, Alchemy, etc.)
BUNDLER_RPC_URL=https://api.pimlico.io/v2/8453/rpc?apikey=YOUR_KEY

# EntryPoint contract address (same for all EVM chains)
ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# HOMEAI token contract on Base
HOMEAI_TOKEN_ADDRESS=0xHOMEAI0000000000000000000000000000000001

# Agent NFT contract on Base
AGENT_NFT_CONTRACT=0x1234567890AbcdEF1234567890aBcdef12345678

# Encryption key for private keys (32 bytes hex)
SDK_ENCRYPT_KEY=your_32_byte_hex_key_here
```

---

## Security Notes

1. **Never log or expose mnemonics** — treat them like passwords.
2. **Use user-derived encryption keys** — don't rely on the SDK's internal key for production.
3. **Upgrade to PBKDF2 / Argon2** for key derivation in production.
4. **Replace HMAC-SHA256 JWT signing** with ES256K (secp256k1 ECDSA) for DID JWTs.
5. **Use a real Bundler** (Pimlico, Alchemy AA) — mock tx hashes are for development only.
