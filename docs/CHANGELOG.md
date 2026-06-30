# Home for AI — Changelog

## Session: June 29, 2026

### Web UI Updates (home-for-ai-ui/)
- **Interactive World Map** (`/market`): 30 clickable countries with stock index slide-over panels (Recharts AreaChart), color-coded by performance, hover tooltips
- **Personal Trading Terminal** (`/trade`): 3-panel layout, 21 assets across stocks/crypto/forex/ETFs/bonds, live order book (2s refresh with color-flash), tabbed order form (Market/Limit/Stop-Limit), open positions with P&L
- **Crypto Wallet** (`/wallet`): BIP-39 12-word setup flow, Send/Receive modals with address validation + 6-digit PIN, procedural QR codes, 10-row tx history, Ledger/Trezor support, Emergency Freeze
- **Convert & Transfer** (`/convert`): Universal swap across 25 assets (Crypto/Stocks/Bonds/Commodities/Fiat), visual route hops, slippage control, transfer history with Recharts pie chart
- **Auth System** (`/auth`): QR code login (2-min refresh, real qrcode npm), Email magic link, Google OAuth stub, Apple Sign-In stub, WebAuthn Passkeys (navigator.credentials.get), 3-step onboarding with agent selection + risk profile, AuthContext, SQLite users/auth_tokens tables

### New: Go API Gateway (`gateway/`)
- Fiber v2 framework, JWT HS256 with algorithm-confusion guard, two-tier token bucket rate limiting
- Helmet-equivalent security headers (CSP, HSTS, Permissions-Policy), zerolog structured logging
- WebSocket fan-out hub — N goroutines per connected client
- Concurrent order book (sync.RWMutex), price-time priority matching engine with VWAP
- EIP-4337 Account Abstraction: full UserOperation struct, CREATE2 wallet factory, BundlerClient
- 8-chain multi-chain registry: Ethereum, Polygon, Arbitrum, Base, BSC, Avalanche, Optimism, Solana
- EIP-1559 Type 2 transaction builder, Chainlink ABI price oracle stubs
- AES-256-GCM wallet encryption, PBKDF2-SHA256 (310k iterations), BIP-39 validation
- Cross-asset transfer pipeline: crypto→fiat→bonds (XBB/AGG/BNDW) / commodities (GLD/SLV/USO) with atomic rollback
- 25 REST routes + WebSocket endpoint
- Multi-stage Docker build (scratch image, non-root UID 1001)

### New: React Native Mobile App (`mobile/`)
- Expo SDK 51, TypeScript, Expo Router file-based routing
- 5 screens: Workshop, Market, Trade, Wallet, Settings
- 3 modals: agent-detail, trade-confirm, send-crypto (4-step)
- Components: GlassCard (expo-blur), AgentCard, SparkLine (react-native-svg), MarketTicker, PriceChart (victory-native), OrderBook, CatAvatar, SecurityBadge
- 4 hooks: useAgents, useMarket, useWallet, useWebSocket (auto-reconnect to Go gateway)
- 3 Zustand stores: agentStore, walletStore, tradeStore
- lib/crypto.ts: expo-crypto AES-256 + BIP-39 helpers
- EAS build + submit config ready for Google Play + App Store

### Backend Additions (`backend/blockchain/`)
- BIP-32/BIP-44 HD wallet derivation via HMAC-SHA512 CKD (eth_account)
- EIP-4337 UserOperation builder with eth_account personal_sign + async BundlerClient
- CoinGecko live price oracle + saga-pattern transfer pipeline with rollback log
- Agent NFT metadata (ERC-721/ERC-1155 ABI stubs, OpenSea-compatible, tier system)
- FastAPI routes: /api/transfer/quote, /api/transfer/execute, /api/transfer/history
- FastAPI routes: /api/blockchain/chains, /api/blockchain/balance, /api/blockchain/sign

### New Docs (`docs/`)
- `app_store_listings.md` — Complete copy for 6 stores (Google Play, App Store, Samsung Galaxy, Amazon, Huawei AppGallery, Microsoft Store)
- `go_to_market_strategy.md` — 12-month GTM: TAM/SAM/SOM, 3 personas, competitive matrix, launch phases, monetization math, ASO, budget
- `enhancement_brainstorm.md` — 35 ideas across AI/UX/Blockchain/B2B/Social categories with priority matrix
