package api

import (
	"context"
	"math/big"

	"github.com/gofiber/fiber/v2"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/agents"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/blockchain"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/execution"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/markets"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/middleware"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/wallet"
)

// AppState holds all shared application components.
type AppState struct {
	Config           *config.Config
	Hub              *gateway.Hub
	AgentHub         *agents.AgentHub
	Heartbeat        *agents.HeartbeatManager
	OrderQueue       *gateway.OrderQueue
	Feed             *markets.AggregatedFeed
	OrderBookRegistry *markets.OrderBookRegistry
	ExecutionEngine  *execution.ExecutionEngine
	MatchingEngine   *execution.MatchingEngine
	Converter        *blockchain.BlockchainConverter
	ChainRegistry    *blockchain.ChainRegistry
}

// RegisterRoutes mounts all REST and WebSocket routes onto the Fiber app.
//
// Route map:
//
//	GET  /health                       — liveness probe (no auth)
//	GET  /ready                        — readiness probe (no auth)
//	GET  /metrics                      — Prometheus-compatible stub
//	WS   /ws                           — WebSocket hub
//	POST /api/v1/auth/login            — issue JWT (stub)
//
//	GET  /api/v1/agents                — list all agents + status
//	POST /api/v1/agents/:id/dispatch   — send command to agent (auth required)
//	GET  /api/v1/agents/heartbeat      — heartbeat status (auth required)
//
//	GET  /api/v1/orders                — list queued orders
//	POST /api/v1/orders                — submit new order (auth required)
//	GET  /api/v1/orders/:id            — get order by ID
//
//	GET  /api/v1/market                — all latest ticks
//	GET  /api/v1/market/:symbol        — tick for specific symbol
//	GET  /api/v1/market/:symbol/book   — order book snapshot
//
//	GET  /api/v1/wallet                — wallet info (auth required)
//	POST /api/v1/wallet/encrypt        — encrypt private key (auth required)
//	POST /api/v1/wallet/validate-mnemonic — validate BIP-39 mnemonic
//
//	POST /api/v1/transfer/quote        — crypto→fiat quote
//	POST /api/v1/transfer/execute      — full pipeline execute (auth required)
//
//	GET  /api/v1/blockchain/chains     — list supported chains
//	GET  /api/v1/blockchain/chains/:id — get chain config
//	POST /api/v1/blockchain/quote      — crypto↔fiat price quote
//	POST /api/v1/blockchain/build-tx   — build EIP-1559 transaction (auth required)
//	POST /api/v1/blockchain/userop     — build UserOperation (auth required)
func RegisterRoutes(app *fiber.App, state *AppState) {
	cfg := state.Config

	// ── Auth & security middleware ────────────────────────────────────────────
	authMiddleware := middleware.AuthMiddleware(cfg)
	optionalAuth := middleware.OptionalAuthMiddleware(cfg)
	rateLimit := middleware.RateLimitMiddleware(cfg)
	strictLimit := middleware.StrictRateLimitMiddleware()

	// ── Public probes ─────────────────────────────────────────────────────────
	app.Get("/health", gateway.HealthCheckHandler())
	app.Get("/ready", gateway.ReadinessHandler(cfg))
	app.Get("/metrics", metricsHandler(state))

	// ── WebSocket ─────────────────────────────────────────────────────────────
	app.Use("/ws", gateway.WSUpgradeMiddleware())
	app.Get("/ws", optionalAuth, gateway.WSHandler(state.Hub))

	// ── Auth ──────────────────────────────────────────────────────────────────
	auth := app.Group("/api/v1/auth", strictLimit)
	auth.Post("/login", loginHandler(cfg))

	// ── Agents ────────────────────────────────────────────────────────────────
	agentsGroup := app.Group("/api/v1/agents", rateLimit)
	agentsGroup.Get("/", listAgentsHandler(state))
	agentsGroup.Get("/heartbeat", authMiddleware, heartbeatStatusHandler(state))
	agentsGroup.Post("/:id/dispatch", authMiddleware, dispatchAgentHandler(state))

	// ── Orders ────────────────────────────────────────────────────────────────
	orders := app.Group("/api/v1/orders", rateLimit)
	orders.Get("/", authMiddleware, listOrdersHandler(state))
	orders.Post("/", authMiddleware, gateway.OrderRouterHandler(state.OrderQueue))
	orders.Get("/:id", authMiddleware, gateway.GetOrderHandler(state.OrderQueue))

	// ── Market data ───────────────────────────────────────────────────────────
	market := app.Group("/api/v1/market", rateLimit)
	market.Get("/", marketAllHandler(state))
	market.Get("/:symbol", marketTickHandler(state))
	market.Get("/:symbol/book", marketOrderBookHandler(state))

	// ── Wallet ────────────────────────────────────────────────────────────────
	walletGroup := app.Group("/api/v1/wallet", rateLimit, authMiddleware)
	walletGroup.Get("/", walletInfoHandler())
	walletGroup.Post("/encrypt", strictLimit, encryptKeyHandler())
	walletGroup.Post("/validate-mnemonic", validateMnemonicHandler())

	// ── Transfer ─────────────────────────────────────────────────────────────
	transfer := app.Group("/api/v1/transfer", rateLimit)
	transfer.Post("/quote", transferQuoteHandler(state))
	transfer.Post("/execute", authMiddleware, strictLimit, transferExecuteHandler(state))

	// ── Blockchain ────────────────────────────────────────────────────────────
	chain := app.Group("/api/v1/blockchain", rateLimit)
	chain.Get("/chains", chainsListHandler(state))
	chain.Get("/chains/:id", chainByIDHandler(state))
	chain.Post("/quote", blockchainQuoteHandler(state))
	chain.Post("/build-tx", authMiddleware, buildTxHandler(state))
	chain.Post("/userop", authMiddleware, buildUserOpHandler(state))

	// ── Fallthrough proxy to Python backend ───────────────────────────────────
	app.Use(rateLimit, gateway.NewReverseProxy(cfg))
}

// ─── Handler implementations ──────────────────────────────────────────────────

func metricsHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"agents_total":    len(state.AgentHub.ListAgents()),
			"market_symbols":  len(state.Feed.AllLatest()),
			"orderbooks":      len(state.OrderBookRegistry.All()),
		})
	}
}

func loginHandler(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// The Go gateway must never manufacture authentication tokens. Until it
		// delegates to the validated Python auth service, fail explicitly.
		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"error": "gateway login is not implemented; use the Python auth service",
		})
	}
}

func listAgentsHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"agents": state.AgentHub.ListAgents(),
			"total":  len(state.AgentHub.ListAgents()),
		})
	}
}

func heartbeatStatusHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(state.Heartbeat.Status())
	}
}

func dispatchAgentHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		agentID := c.Params("id")
		var body map[string]interface{}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}

		cmdType, _ := body["type"].(string)
		if cmdType == "" {
			cmdType = "generic"
		}

		err := state.AgentHub.Dispatch(agentID, agents.AgentCommand{
			ID:      "cmd-" + agentID,
			Type:    cmdType,
			Payload: body,
		})
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "dispatched", "agent_id": agentID})
	}
}

func listOrdersHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "orders list — stored in execution engine"})
	}
}

func marketAllHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(state.Feed.AllLatest())
	}
}

func marketTickHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		symbol := c.Params("symbol")
		tick, ok := state.Feed.Latest(symbol)
		if !ok {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "symbol not found"})
		}
		return c.JSON(tick)
	}
}

func marketOrderBookHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		symbol := c.Params("symbol")
		depth := 20
		book := state.OrderBookRegistry.GetOrCreate(symbol)
		return c.JSON(book.Snapshot(depth))
	}
}

func walletInfoHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "wallet info endpoint — returns on-chain balances via Python backend",
		})
	}
}

func encryptKeyHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			PrivKey    string `json:"priv_key"`
			Passphrase string `json:"passphrase"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		encrypted, err := wallet.SealPrivateKey(body.PrivKey, body.Passphrase)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(encrypted)
	}
}

func validateMnemonicHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			Mnemonic string `json:"mnemonic"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		if err := wallet.ValidateBIP39Mnemonic(body.Mnemonic); err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"valid": false, "error": err.Error(),
			})
		}
		return c.JSON(fiber.Map{"valid": true})
	}
}

func transferQuoteHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			FromChain      int64   `json:"from_chain"`
			TokenAddress   string  `json:"token_address"`
			TokenSymbol    string  `json:"token_symbol"`
			Amount         float64 `json:"amount"`
			TargetCurrency string  `json:"target_currency"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		quote, err := wallet.CryptoToFiat(
			c.Context(),
			body.FromChain, body.TokenAddress, body.TokenSymbol,
			body.Amount, body.TargetCurrency,
		)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(quote)
	}
}

func transferExecuteHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			FromChain    int64              `json:"from_chain"`
			TokenAddress string             `json:"token_address"`
			TokenSymbol  string             `json:"token_symbol"`
			Amount       float64            `json:"amount"`
			Target       wallet.TransferTarget `json:"target"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		result, err := wallet.FullTransfer(
			context.Background(),
			body.FromChain, body.TokenAddress, body.TokenSymbol,
			body.Amount, body.Target,
		)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":  err.Error(),
				"result": result,
			})
		}
		return c.JSON(result)
	}
}

func chainsListHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"chains": state.ChainRegistry.All(),
			"total":  len(state.ChainRegistry.All()),
		})
	}
}

func chainByIDHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid chain id"})
		}
		chain, err := state.ChainRegistry.Get(int64(id))
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(chain)
	}
}

func blockchainQuoteHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			TokenSymbol string  `json:"token_symbol"`
			Amount      float64 `json:"amount"`
			Currency    string  `json:"currency"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		quote, err := state.Converter.CryptoToFiatQuote(
			c.Context(), body.TokenSymbol, body.Amount, body.Currency,
		)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(quote)
	}
}

func buildTxHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			ChainID int64  `json:"chain_id"`
			Nonce   uint64 `json:"nonce"`
			To      string `json:"to"`
			Value   string `json:"value"` // wei as decimal string
			Data    string `json:"data"`  // hex encoded
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}
		return c.JSON(fiber.Map{
			"message":  "EIP-1559 transaction built",
			"chain_id": body.ChainID,
			"nonce":    body.Nonce,
			"to":       body.To,
		})
	}
}

func buildUserOpHandler(state *AppState) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var body struct {
			ChainID      int64  `json:"chain_id"`
			OwnerAddress string `json:"owner_address"`
			Salt         uint64 `json:"salt"`
			Target       string `json:"target"`
			CallData     string `json:"call_data"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		}

		builder, err := blockchain.NewUserOpBuilder(body.ChainID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		op, err := builder.BuildNewWalletOp(
			body.OwnerAddress,
			body.Salt,
			body.Target,
			big.NewInt(0),
			[]byte{},
		)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(op.ToHex())
	}
}
