# home-for-ai-gateway

Production-grade Go API gateway built with [Fiber v2](https://gofiber.io), sitting in front of the Python FastAPI backend (port 8000). Handles real-time WebSocket fan-out, multi-chain blockchain operations, EIP-4337 Account Abstraction, order routing, and crypto↔fiat conversion.

---

## Architecture

```
                          ┌─────────────────────────────────────────────────┐
                          │         home-for-ai-gateway  :3000               │
                          │                                                   │
  Clients ─── HTTPS ───▶  │  SecurityMW ─▶ RateLimitMW ─▶ AuthMW            │
  Clients ─── WSS ─────▶  │      │                                           │
                          │      ▼                                           │
                          │  ┌──────────────┐   ┌──────────────────────┐    │
                          │  │  WS Hub      │   │  REST Routes          │    │
                          │  │  fan-out to  │   │  /api/v1/agents       │    │
                          │  │  N clients   │   │  /api/v1/orders       │    │
                          │  └──────┬───────┘   │  /api/v1/market       │    │
                          │         │           │  /api/v1/wallet        │    │
                          │         │           │  /api/v1/transfer      │    │
                          │         │           │  /api/v1/blockchain    │    │
                          │         │           └────────────┬───────────┘    │
                          │         │                        │                │
                          │  ┌──────▼──────────────────────▼──────────────┐  │
                          │  │              AppState                        │  │
                          │  │  AgentHub(8)  │  OrderQueue  │  Feed        │  │
                          │  │  ExecEngine   │  MatchEngine │  OBRegistry  │  │
                          │  │  Converter    │  ChainRegistry              │  │
                          │  └────────────────────────────┬────────────────┘  │
                          │                               │                   │
                          │              Reverse Proxy    ▼                   │
                          └────────────────────── :8000 (Python FastAPI) ─────┘
```

---

## Package Layout

```
home-for-ai-gateway/
├── main.go                  Fiber app bootstrap, graceful shutdown
├── go.mod
├── go.sum
├── config/
│   └── config.go            Environment-driven configuration
├── middleware/
│   ├── auth.go              JWT HS256 validation, __Host-session cookie
│   ├── ratelimit.go         Token bucket per-IP + per-user
│   ├── security.go          Helmet-equivalent headers, CORS, HSTS
│   └── logging.go           Structured zerolog request logging
├── gateway/
│   ├── proxy.go             Reverse proxy to Python backend
│   ├── websocket.go         WebSocket hub: fan-out to N clients
│   └── orderrouter.go       Order routing: validate, queue, dispatch
├── agents/
│   ├── hub.go               Agent registry: 8 agents, goroutine + channel
│   └── heartbeat.go         5s ping/pong, reconnect on drop
├── markets/
│   ├── feed.go              Aggregated market data feeds (mock + API-ready)
│   └── orderbook.go         Concurrent order book (sync.RWMutex)
├── execution/
│   ├── engine.go            Trade execution state machine: PENDING→SETTLED
│   └── matching.go          Price-time priority matching engine
├── wallet/
│   ├── crypto.go            AES-256-GCM key derivation, BIP-39 validation
│   └── transfer.go          Full crypto→fiat→bond/commodity pipeline
├── blockchain/
│   ├── evm.go               EIP-1559 Type 2 transaction builder
│   ├── eip4337.go           EIP-4337 Account Abstraction + bundler client
│   ├── multichain.go        Chain registry: 8 chains (Ethereum, Polygon, etc.)
│   └── converter.go         Chainlink ABI stubs, crypto↔fiat conversion
├── api/
│   └── routes.go            All REST + WebSocket routes
└── Dockerfile               Multi-stage scratch build, non-root user
```

---

## Quick Start

### Prerequisites
- Go 1.22+
- Python FastAPI backend running on port 8000

### Run locally

```bash
# Clone / enter directory
cd home-for-ai-gateway

# Download dependencies
go mod download

# Set required env vars
export JWT_SECRET="your-256-bit-secret"
export BACKEND_URL="http://localhost:8000"
export PORT="3000"

# Run
go run ./main.go
```

### Run with Docker

```bash
docker build -t home-for-ai-gateway .
docker run -p 3000:3000 \
  -e JWT_SECRET="your-256-bit-secret" \
  -e BACKEND_URL="http://host.docker.internal:8000" \
  home-for-ai-gateway
```

---

## Environment Variables

| Variable                 | Default                          | Description                                      |
|--------------------------|----------------------------------|--------------------------------------------------|
| `PORT`                   | `3000`                           | Gateway listen port                              |
| `BACKEND_URL`            | `http://localhost:8000`          | Python FastAPI backend URL                       |
| `JWT_SECRET`             | `change-me-in-production`        | HMAC-SHA256 JWT signing secret (min 32 bytes)    |
| `JWT_EXPIRY`             | `24h`                            | JWT token lifetime (Go duration string)          |
| `JWT_ISSUER`             | `home-for-ai-gateway`            | JWT `iss` claim                                  |
| `JWT_AUDIENCE`           | `home-for-ai`                    | JWT `aud` claim                                  |
| `SESSION_COOKIE`         | `__Host-session`                 | Secure session cookie name                       |
| `RATE_LIMIT_RPS`         | `100`                            | Token bucket refill rate (requests/sec per IP)   |
| `RATE_LIMIT_BURST`       | `200`                            | Token bucket burst capacity                      |
| `HSTS_MAX_AGE`           | `31536000`                       | HSTS max-age in seconds (1 year)                 |
| `LOG_LEVEL`              | `info`                           | `debug` / `info` / `warn` / `error`              |
| `LOG_FORMAT`             | `json`                           | `json` (production) / `text` (dev)               |
| `AGENT_COUNT`            | `8`                              | Number of agent goroutines to spawn              |
| `MAX_ORDER_QUEUE_SIZE`   | `10000`                          | Maximum buffered orders                          |
| `ETH_RPC_URL`            | `https://eth.llamarpc.com`       | Ethereum JSON-RPC endpoint                       |
| `POLYGON_RPC_URL`        | `https://polygon.llamarpc.com`   | Polygon JSON-RPC endpoint                        |
| `ARBITRUM_RPC_URL`       | `https://arbitrum.llamarpc.com`  | Arbitrum JSON-RPC endpoint                       |
| `BASE_RPC_URL`           | `https://base.llamarpc.com`      | Base JSON-RPC endpoint                           |
| `BSC_RPC_URL`            | `https://bsc.publicnode.com`     | BSC JSON-RPC endpoint                            |
| `AVALANCHE_RPC_URL`      | `https://avalanche.publicnode.com/ext/bc/C/rpc` | Avalanche C-Chain endpoint   |
| `OPTIMISM_RPC_URL`       | `https://optimism.llamarpc.com`  | Optimism JSON-RPC endpoint                       |
| `SOLANA_RPC_URL`         | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint                         |
| `NEW_RELIC_LICENSE_KEY`  | _(empty)_                        | New Relic license key (optional)                 |
| `ALLOWED_ORIGIN_1`       | `https://homeforai.com`          | First allowed CORS origin                        |
| `ALLOWED_ORIGIN_2`       | `https://app.homeforai.com`      | Second allowed CORS origin                       |

---

## API Reference

### Public endpoints (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe (checks backend) |
| GET | `/metrics` | Agent/market metrics stub |
| WS | `/ws` | WebSocket hub |
| POST | `/api/v1/auth/login` | Issue JWT (stub) |

### Agents (auth optional/required)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/agents` | No | List all agents + status |
| GET | `/api/v1/agents/heartbeat` | Yes | Heartbeat status per agent |
| POST | `/api/v1/agents/:id/dispatch` | Yes | Dispatch command to agent |

### Orders (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/orders` | List orders |
| POST | `/api/v1/orders` | Submit new order (LIMIT/MARKET/STOP_LIMIT) |
| GET | `/api/v1/orders/:id` | Get order by ID |

### Market data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/market` | All latest ticks |
| GET | `/api/v1/market/:symbol` | Tick for one symbol |
| GET | `/api/v1/market/:symbol/book` | Order book depth snapshot |

### Wallet (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wallet` | Wallet info |
| POST | `/api/v1/wallet/encrypt` | Encrypt private key with passphrase |
| POST | `/api/v1/wallet/validate-mnemonic` | Validate BIP-39 mnemonic |

### Transfer
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/transfer/quote` | No | Get crypto→fiat quote |
| POST | `/api/v1/transfer/execute` | Yes | Full crypto→fiat→bond/commodity |

### Blockchain
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/blockchain/chains` | No | List all supported chains |
| GET | `/api/v1/blockchain/chains/:id` | No | Chain config by ID |
| POST | `/api/v1/blockchain/quote` | No | Chainlink price quote |
| POST | `/api/v1/blockchain/build-tx` | Yes | Build EIP-1559 transaction |
| POST | `/api/v1/blockchain/userop` | Yes | Build EIP-4337 UserOperation |

---

## WebSocket Events

Connect to `wss://gateway/ws` (JWT required for agent events).

| Event type | Payload | Description |
|------------|---------|-------------|
| `market.tick` | `Tick` | Real-time price tick |
| `agent.update` | `AgentInfo` | Agent status change |
| `agent.heartbeat` | heartbeat object | Periodic ping confirmation |
| `agent.heartbeat.missed` | `{agent_id, missed_pings}` | Missed heartbeat alert |
| `agent.offline` | `{agent_id, reason}` | Agent offline after max retries |
| `agent.reconnected` | `{agent_id, attempt}` | Agent came back online |
| `order.queued` | `Order` | Order accepted into queue |
| `order.executing` | `Order` | Order dispatched to execution |
| `order.filled` | `Order` | Order fully filled |
| `trade.state.FILLED` | `Trade` | Trade filled |
| `trade.state.SETTLING` | `Trade` | Trade submitted to chain |
| `trade.state.SETTLED` | `Trade` | Trade confirmed on chain |

---

## Supported Chains

| Name | Chain ID | Native | USDC Contract |
|------|----------|--------|---------------|
| Ethereum | 1 | ETH | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Polygon | 137 | MATIC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Arbitrum One | 42161 | ETH | `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8` |
| Base | 8453 | ETH | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| BNB Smart Chain | 56 | BNB | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| Avalanche C-Chain | 43114 | AVAX | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| Optimism | 10 | ETH | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| Solana | — (SVM) | SOL | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

---

## Module Initialization

```bash
go mod init github.com/simpliibarrii-crypto/home-for-ai-gateway
go mod tidy
```

---

## Security Notes

- JWT uses HS256; algorithm is enforced server-side (no `alg: none` attack surface)
- `__Host-session` cookie: `HttpOnly; Secure; SameSite=Strict; Path=/`
- Rate limiting: token bucket per IP (100 RPS / burst 200) + per user (50 RPS / burst 100)
- Sensitive endpoints (auth, transfer, sign): strict 10 RPS / burst 20
- Private keys encrypted with AES-256-GCM; key derived via PBKDF2-SHA256 (310,000 iterations)
- Docker final image: `scratch` — zero attack surface, no shell, no package manager
