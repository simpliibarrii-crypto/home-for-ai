# Home for AI — Agent Trading Backend

An autonomous AI trading platform with 8 cat-identity agents powered by a **Kimi 2.6 + DeepSeek V3 fusion** running on OpenRouter. Exposes a FastAPI backend that a React frontend connects to via WebSocket and REST.

---

## Architecture Overview

```
React Frontend
     │ WebSocket (/ws/{client_id})
     │ REST (HTTP /api/v1/...)
     ▼
┌──────────────────────────────────────────┐
│              FastAPI App (main.py)        │
│  CORS · JWT middleware · slowapi limits  │
├──────────────────────────────────────────┤
│  api/routes/   (REST)                    │
│   agents · chat · portfolio ·            │
│   market · copy_trade · settings         │
│  api/websocket_manager.py  (WS)          │
├──────────────────────────────────────────┤
│  agents/                                 │
│   8 × TradingAgent (async event loops)  │
│   ├── base_agent.py  (state machine)     │
│   ├── trading_agent.py (wires all deps)  │
│   ├── agent_registry.py (8 identities)  │
│   └── skill_engine.py (learn from wins) │
├──────────────────────────────────────────┤
│  models/                                 │
│   ├── fusion_llm.py   (Kimi + DeepSeek) │
│   ├── market_analyzer.py               │
│   └── decision_engine.py               │
├──────────────────────────────────────────┤
│  markets/                                │
│   ├── data_fetcher.py  (yfinance etc.)  │
│   ├── news_fetcher.py  (RSS feeds)      │
│   ├── portfolio_manager.py             │
│   └── copy_trade_engine.py             │
├──────────────────────────────────────────┤
│  security/                              │
│   auth · encryption · rate_limiter ·   │
│   input_validator                       │
├──────────────────────────────────────────┤
│  db/  (SQLAlchemy async ORM)            │
│   SQLite (dev) / PostgreSQL (prod)      │
└──────────────────────────────────────────┘
```

---

## Kimi 2.6 + DeepSeek V3 Fusion

Both models are accessed via [OpenRouter](https://openrouter.ai) using the OpenAI SDK-compatible API.

| Step | Model | Role |
|------|-------|------|
| 1. News analysis | **Kimi 2.6** (`moonshotai/kimi-k2.6`) | Long-context (128K): synthesises up to 30 news headlines + macro themes into a structured sentiment report |
| 2. Trade decision | **DeepSeek V3** (`deepseek/deepseek-v3.2`) | Fast structured output: produces BUY/SELL/HOLD with confidence score, stop-loss, take-profit |
| 3. High-stakes validation | **Both in parallel** | When DeepSeek confidence ≥ 80%, Kimi is called to validate. Weighted vote: 60% DeepSeek, 40% Kimi |
| 4. Disagreement | **DeepSeek arbitrates** | A meta-prompt to DeepSeek resolves conflicts. Confidence is penalised 10% for disagreement |
| 5. LLM outage | **Rule-based fallback** | Personality-driven rules (momentum buys rallies, contrarian fades them) ensure the platform never halts |

---

## The 8 Agents

| Agent | Emoji | Personality | Market | Salary/day | Working Hours |
|-------|-------|-------------|--------|------------|---------------|
| **Luna** | 🐱 | Momentum | Stocks | $850 | Market hours (9:30–16:00 ET) |
| **Shadow** | 🐈‍⬛ | Aggressive | Crypto | $1,200 | 24/7 |
| **Pixel** | 😸 | Technical | Forex | $720 | 24/5 |
| **Nova** | 😻 | Contrarian | Crypto | $980 | 24/7 |
| **Blaze** | 🙀 | Safe-Haven | Commodities | $650 | Market hours |
| **Echo** | 😺 | Conservative | Bonds | $500 | Market hours |
| **Cipher** | 🐾 | Quant | Stocks | $1,100 | Market + pre/post |
| **Mochi** | 😽 | Trend-following | Crypto | $890 | 24/7 |

Each agent has a home address, email, learned skills, and a win/loss record that grows over time.

---

## Setup

### Prerequisites

- Python 3.11+
- An [OpenRouter](https://openrouter.ai) API key

### Installation

```bash
# Clone / navigate to the backend directory
cd home-for-ai-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add your OPENROUTER_API_KEY and generate a SECRET_KEY

# Run the development server
python main.py
# or
uvicorn main:app --reload --port 8000
```

The API is available at `http://localhost:8000`.  
OpenAPI docs: `http://localhost:8000/docs`

### Running Tests

```bash
pytest
# or with coverage:
pytest --cov=. --cov-report=html
```

Tests do **not** require an OpenRouter API key — all LLM calls are mocked.

---

## API Endpoints Reference

### Agents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agents` | List all 8 agents |
| `GET` | `/api/v1/agents/{id}` | Single agent detail |
| `GET` | `/api/v1/agents/{id}/trades` | Trade history (paginated) |
| `GET` | `/api/v1/agents/{id}/skills` | Learned skills |
| `POST` | `/api/v1/agents/{id}/start` | Start agent loop |
| `POST` | `/api/v1/agents/{id}/stop` | Stop agent loop |

### Chat

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/chat` | Send message to agent (REST) |
| `WS` | `/api/v1/chat/ws/{agent_id}` | Streaming WebSocket chat |

### Portfolio

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/portfolio` | Aggregated portfolio (all agents) |
| `GET` | `/api/v1/portfolio/{agent_id}` | Single agent P&L |
| `GET` | `/api/v1/portfolio/history` | Time-series P&L for charting |
| `GET` | `/api/v1/portfolio/{agent_id}/positions` | Open positions |

### Market

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/market/prices?symbols=AAPL,BTC-USD` | Current prices |
| `GET` | `/api/v1/market/news?market=Crypto` | Latest news |
| `GET` | `/api/v1/market/symbols` | Symbol catalogue |

### Copy Trade

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/copy-trade/enable` | Subscribe to agent |
| `POST` | `/api/v1/copy-trade/disable` | Unsubscribe |
| `GET` | `/api/v1/copy-trade/status` | Your active subscriptions |
| `GET` | `/api/v1/copy-trade/portfolio` | Your copy-trade P&L |

### Auth & Settings

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login → token pair |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/api-key` | Generate API key |
| `GET` | `/api/v1/settings` | Get settings |
| `POST` | `/api/v1/settings` | Update settings |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Agent status + WS connections |

---

## WebSocket Events

Connect to `ws://localhost:8000/ws/{client_id}` then send:

```json
{"action": "subscribe", "agents": ["luna", "shadow"], "symbols": ["BTC-USD", "AAPL"]}
```

### Server → Client Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `agent:status` | `{agent_id, state, previous_state}` | Agent state changes |
| `agent:trade` | `{agent_id, symbol, action, price, confidence, reasoning}` | Trade executed |
| `agent:pnl` | `{agent_id, total_value, total_pnl_pct, daily_pnl_pct, drawdown_30d_pct}` | Hourly P&L update |
| `agent:skill_learned` | `{agent_id, skill}` | Agent learns from win/loss |
| `market:tick` | `{symbol, price, change_24h}` | Price tick (subscribed symbols) |
| `chat:message` | `{agent_id, response, user_message}` | Agent chat response |
| `copy_trade:update` | `{agent_id, symbol, action, price, user_trade}` | Mirrored trade executed |
| `copy_trade:paused` | `{agent_id, reason, drawdown_pct}` | Copy trading paused |
| `pong` | `{ts}` | Response to ping |

### Client → Server Actions

```json
{"action": "subscribe",   "agents": ["luna"], "symbols": ["AAPL"]}
{"action": "unsubscribe", "symbols": ["AAPL"]}
{"action": "ping"}
```

---

## Security Architecture

| Layer | Implementation |
|-------|---------------|
| **Auth** | JWT (HS256) — 24h access tokens, 7d refresh tokens |
| **Session cookie** | `__Host-session` (Secure; HttpOnly; SameSite=Strict) |
| **API keys** | 32-byte random hex, SHA-256 hashed in DB, AES-256-GCM encrypted |
| **Passwords** | bcrypt, work factor 12 |
| **Encryption at rest** | AES-256-GCM + PBKDF2-SHA256 (600,000 iterations) per NIST 2023 |
| **Rate limiting** | 100 req/min REST (per user or IP via slowapi) |
| **Input validation** | HTML stripping, SQL injection detection, prompt injection detection |
| **CORS** | Allowlist from `ALLOWED_ORIGINS` env var |

---

## Copy Trade Economics

- **Position sizing**: `user_position = agent_position × (user_value / agent_value) × copy_ratio`
- **Platform fee**: 15% of net profits only (never charged on losses)
- **Circuit breaker**: If agent drawdown > 15% over 30 days → all copy subscriptions for that agent are paused and users are notified via WebSocket
- **Copy ratio**: Configurable 0.05–1.0 per subscription (reduces exposure)

---

## Connecting the React Frontend

Set in your React app's `.env`:

```
VITE_API_BASE=http://localhost:8000/api/v1
VITE_WS_BASE=ws://localhost:8000
```

WebSocket connection example:

```typescript
const ws = new WebSocket(`${import.meta.env.VITE_WS_BASE}/ws/${clientId}?user_id=${userId}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: "subscribe",
    agents: ["luna", "shadow", "pixel", "nova", "blaze", "echo", "cipher", "mochi"],
    symbols: ["BTC-USD", "AAPL", "EURUSD=X"]
  }));
};

ws.onmessage = (e) => {
  const { event, payload } = JSON.parse(e.data);
  // Handle event...
};
```

---

## Data Sources

| Market | Source | API Key Required |
|--------|--------|-----------------|
| Stocks, ETFs, Bonds, Commodities | [yfinance](https://github.com/ranaroussi/yfinance) | No |
| Crypto | [CoinGecko API v3](https://www.coingecko.com/en/api/documentation) | No (free tier) |
| Forex | [Frankfurter API](https://www.frankfurter.app/) | No |
| News (Stocks) | Yahoo Finance RSS, Reuters RSS | No |
| News (Crypto) | CoinDesk RSS, CoinTelegraph RSS | No |
| News (Forex) | FXStreet RSS, ForexLive RSS | No |

---

## Production Checklist

- [ ] Set `ENVIRONMENT=production` (disables `/docs`)
- [ ] Use PostgreSQL (`DATABASE_URL=postgresql+asyncpg://...`)
- [ ] Set strong random `SECRET_KEY` and `ENCRYPTION_KEY`
- [ ] Configure `ALLOWED_ORIGINS` to your actual domain
- [ ] Run behind a reverse proxy (nginx/caddy) with TLS
- [ ] Use Alembic for database migrations (`alembic upgrade head`)
- [ ] Set up log aggregation (Datadog, Loki, etc.)
- [ ] Configure `MAX_DRAWDOWN_PERCENT` to your risk tolerance
