package middleware

import (
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
)

// InitLogger configures the global zerolog logger based on config.
func InitLogger(cfg *config.Config) {
	if cfg.LogFormat == "text" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	} else {
		// JSON structured logging for production
		log.Logger = zerolog.New(os.Stdout).With().Timestamp().Caller().Logger()
	}

	switch cfg.LogLevel {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

// LoggingMiddleware produces structured zerolog request logs with:
//   - method, path, status, latency, request ID, user ID, IP, user-agent
//   - slow query detection (>500ms → warn level)
//   - error logging at error level for 5xx responses
func LoggingMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()

		// Build common event fields
		event := log.With().
			Str("request_id", c.GetRespHeader("X-Request-ID")).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Str("ip", c.IP()).
			Str("user_agent", c.Get("User-Agent")).
			Int("status", status).
			Dur("latency_ms", latency).
			Int("bytes_out", len(c.Response().Body())).
			Logger()

		// Include user ID if authenticated
		if userID, ok := c.Locals("userID").(string); ok && userID != "" {
			event = event.With().Str("user_id", userID).Logger()
		}

		msg := "request"

		switch {
		case status >= 500:
			event.Error().Msg(msg)
		case status >= 400:
			event.Warn().Msg(msg)
		case latency > 500*time.Millisecond:
			event.Warn().Str("alert", "slow_request").Msg(msg)
		default:
			event.Info().Msg(msg)
		}

		return err
	}
}

// RecoveryMiddleware catches panics and logs them, returning a 500.
func RecoveryMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) (err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Error().
					Interface("panic", r).
					Str("path", c.Path()).
					Str("method", c.Method()).
					Msg("panic recovered")
				err = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "internal server error",
				})
			}
		}()
		return c.Next()
	}
}
