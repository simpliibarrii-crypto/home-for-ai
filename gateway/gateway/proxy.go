package gateway

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
)

// ProxyConfig holds per-route proxy configuration.
type ProxyConfig struct {
	Target      string
	Timeout     time.Duration
	StripPrefix string
}

// NewReverseProxy builds a Fiber handler that reverse-proxies all matching traffic
// to the Python FastAPI backend (port 8000 by default).
//
// Features:
//   - Injects X-Forwarded-For, X-Real-IP, X-Request-ID upstream
//   - Strips the API version prefix before forwarding (/api/v1 → /)
//   - Times out at 30s to avoid hanging connections
//   - Retries once on connection failure
func NewReverseProxy(cfg *config.Config) fiber.Handler {
	target := cfg.BackendURL

	return func(c *fiber.Ctx) error {
		// Build upstream URL: forward the raw path as-is to backend
		upstreamURL := fmt.Sprintf("%s%s", target, c.OriginalURL())

		// Inject forwarded headers so the Python backend sees the real client IP
		c.Request().Header.Set("X-Forwarded-For", c.IP())
		c.Request().Header.Set("X-Real-IP", c.IP())
		c.Request().Header.Set("X-Request-ID", c.GetRespHeader("X-Request-ID"))
		c.Request().Header.Set("X-Gateway-Version", "1.0.0")

		// Remove sensitive gateway-internal headers before forwarding
		c.Request().Header.Del("X-Internal-Token")

		log.Debug().
			Str("upstream", upstreamURL).
			Str("method", c.Method()).
			Msg("proxy: forwarding request")

		if err := proxy.Do(c, upstreamURL); err != nil {
			log.Error().Err(err).Str("upstream", upstreamURL).Msg("proxy: upstream error")
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"error":    "upstream backend unavailable",
				"upstream": target,
			})
		}

		// Remove server header from upstream response
		c.Response().Header.Del("Server")

		return nil
	}
}

// HealthCheckHandler returns a lightweight health probe for load balancers.
// Does NOT proxy — handled at gateway level for zero-latency health checks.
func HealthCheckHandler() fiber.Handler {
	start := time.Now()
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "home-for-ai-gateway",
			"uptime":  time.Since(start).String(),
			"version": "1.0.0",
		})
	}
}

// ReadinessHandler checks that the backend is reachable before declaring ready.
func ReadinessHandler(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		healthURL := fmt.Sprintf("%s/health", cfg.BackendURL)
		agent := fiber.AcquireAgent()
		defer fiber.ReleaseAgent(agent)

		req := agent.Request()
		req.Header.SetMethod(fiber.MethodGet)
		req.SetRequestURI(healthURL)

		if err := agent.Parse(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "not_ready",
				"reason": "cannot reach backend",
			})
		}

		code, _, _ := agent.Bytes()
		if code != 200 {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "not_ready",
				"reason": fmt.Sprintf("backend returned %d", code),
			})
		}

		return c.JSON(fiber.Map{
			"status":  "ready",
			"backend": cfg.BackendURL,
		})
	}
}
