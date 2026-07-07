package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/agents"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/api"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/blockchain"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/execution"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/markets"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/middleware"
)

func main() {
	// ── Load configuration ────────────────────────────────────────────────────
	cfg := config.Load()

	// ── Initialise structured logger ──────────────────────────────────────────
	middleware.InitLogger(cfg)
	log.Info().Str("port", cfg.Port).Str("backend", cfg.BackendURL).Msg("gateway: starting")

	// ── Initialise shared state ───────────────────────────────────────────────
	wsHub := gateway.NewHub()
	agentHub := agents.NewAgentHub(wsHub)
	heartbeatMgr := agents.NewHeartbeatManager(agentHub, wsHub)
	orderQueue := gateway.NewOrderQueue(cfg.MaxOrderQueueSize, wsHub)
	feed := markets.NewAggregatedFeed(wsHub)
	obRegistry := markets.NewOrderBookRegistry()
	execEngine := execution.NewExecutionEngine(1024, wsHub)
	matchEngine := execution.NewMatchingEngine(obRegistry, execEngine)
	converter := blockchain.NewBlockchainConverter()
	chainRegistry := blockchain.NewChainRegistry()

	state := &api.AppState{
		Config:            cfg,
		Hub:               wsHub,
		AgentHub:          agentHub,
		Heartbeat:         heartbeatMgr,
		OrderQueue:        orderQueue,
		Feed:              feed,
		OrderBookRegistry: obRegistry,
		ExecutionEngine:   execEngine,
		MatchingEngine:    matchEngine,
		Converter:         converter,
		ChainRegistry:     chainRegistry,
	}

	// ── Build Fiber application ───────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		AppName:               "home-for-ai-gateway",
		ReadTimeout:           cfg.ReadTimeout,
		WriteTimeout:          cfg.WriteTimeout,
		IdleTimeout:           cfg.IdleTimeout,
		DisableStartupMessage: false,
		ErrorHandler:          globalErrorHandler,
		// Trusted proxy check disabled by default — enable with specific IPs in production
		EnableTrustedProxyCheck: false,
		TrustedProxies:          []string{},
		ProxyHeader:             fiber.HeaderXForwardedFor,
	})

	// ── Global middleware stack ───────────────────────────────────────────────
	app.Use(middleware.RecoveryMiddleware())
	app.Use(middleware.RequestIDMiddleware())
	app.Use(middleware.SecurityMiddleware(cfg))
	app.Use(middleware.LoggingMiddleware())

	// ── Register all routes ───────────────────────────────────────────────────
	api.RegisterRoutes(app, state)

	// ── Graceful shutdown ─────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server in background goroutine
	addr := fmt.Sprintf(":%s", cfg.Port)
	go func() {
		log.Info().Str("addr", addr).Msg("gateway: listening")
		if err := app.Listen(addr); err != nil {
			log.Fatal().Err(err).Msg("gateway: listen error")
		}
	}()

	// Wait for shutdown signal
	sig := <-quit
	log.Info().Str("signal", sig.String()).Msg("gateway: shutdown initiated")

	// Give in-flight requests time to complete
	if err := app.ShutdownWithTimeout(cfg.ShutdownTimeout); err != nil {
		log.Error().Err(err).Msg("gateway: forced shutdown after timeout")
	}

	// Gracefully stop subsystems
	heartbeatMgr.Stop()
	execEngine.Stop()
	feed.Close()

	log.Info().Msg("gateway: shutdown complete")
}

// globalErrorHandler is the Fiber-level error handler.
func globalErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := "internal server error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		msg = e.Message
	}

	log.Error().
		Err(err).
		Int("status", code).
		Str("path", c.Path()).
		Msg("gateway: unhandled error")

	return c.Status(code).JSON(fiber.Map{
		"error":      msg,
		"status":     code,
		"request_id": c.GetRespHeader("X-Request-ID"),
		"timestamp":  time.Now().UTC(),
	})
}
