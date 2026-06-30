package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
)

// SecurityMiddleware applies production-grade HTTP security headers equivalent to Helmet.js.
// Includes: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, CORS, Referrer-Policy.
func SecurityMiddleware(cfg *config.Config) fiber.Handler {
	allowedOriginSet := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		allowedOriginSet[o] = struct{}{}
	}

	hsts := fmt.Sprintf("max-age=%d; includeSubDomains; preload", cfg.HSTSMaxAge)

	csp := strings.Join([]string{
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https:",
		"font-src 'self' data:",
		"connect-src 'self' wss: https:",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	}, "; ")

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// ── CORS ──────────────────────────────────────────────────────────────
		if origin != "" {
			if _, allowed := allowedOriginSet[origin]; allowed {
				c.Set("Access-Control-Allow-Origin", origin)
				c.Set("Access-Control-Allow-Credentials", "true")
				c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
				c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Trace-ID")
				c.Set("Access-Control-Max-Age", "86400")
				c.Set("Vary", "Origin")
			}
		}

		// Preflight fast-path
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}

		// ── Security headers ──────────────────────────────────────────────────
		// HSTS (only meaningful over TLS; harmless otherwise)
		c.Set("Strict-Transport-Security", hsts)

		// Prevent clickjacking (belt-and-suspenders with CSP frame-ancestors)
		c.Set("X-Frame-Options", "DENY")

		// Prevent MIME-type sniffing
		c.Set("X-Content-Type-Options", "nosniff")

		// XSS protection (legacy browsers)
		c.Set("X-XSS-Protection", "1; mode=block")

		// DNS prefetch control
		c.Set("X-DNS-Prefetch-Control", "off")

		// Referrer policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions / Feature policy
		c.Set("Permissions-Policy",
			"geolocation=(), camera=(), microphone=(), payment=(), usb=()")

		// Content Security Policy
		c.Set("Content-Security-Policy", csp)

		// Remove server identifier
		c.Set("Server", "")

		// Cross-Origin isolation
		c.Set("Cross-Origin-Opener-Policy", "same-origin")
		c.Set("Cross-Origin-Embedder-Policy", "require-corp")
		c.Set("Cross-Origin-Resource-Policy", "same-origin")

		return c.Next()
	}
}

// RequestIDMiddleware injects a unique X-Request-ID (UUID v4) into every request and response.
func RequestIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("X-Request-ID", requestID)
		c.Locals("requestID", requestID)
		return c.Next()
	}
}
