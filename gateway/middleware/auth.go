package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
)

// Claims represents the JWT payload for authenticated sessions.
type Claims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates HS256 JWT tokens from the Authorization header
// or the __Host-session cookie (HttpOnly, Secure, SameSite=Strict).
// It sets `locals.claims` for downstream handlers.
func AuthMiddleware(cfg *config.Config) fiber.Handler {
	secret := []byte(cfg.JWTSecret)

	return func(c *fiber.Ctx) error {
		var tokenStr string

		// 1. Try Authorization: Bearer <token>
		if auth := c.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
			tokenStr = strings.TrimPrefix(auth, "Bearer ")
		}

		// 2. Fall back to __Host-session cookie
		if tokenStr == "" {
			tokenStr = c.Cookies(cfg.SessionCookie)
		}

		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authentication token",
			})
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			// Enforce HS256 only — reject RS256 algorithm confusion attacks
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return secret, nil
		}, jwt.WithIssuer(cfg.JWTIssuer),
			jwt.WithAudiences([]string{cfg.JWTAudience}),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(30*time.Second),
		)

		if err != nil || !token.Valid {
			log.Warn().Err(err).Str("ip", c.IP()).Msg("auth: invalid token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		// Store claims in locals for downstream handlers
		c.Locals("claims", claims)
		c.Locals("userID", claims.UserID)

		return c.Next()
	}
}

// OptionalAuthMiddleware parses the JWT if present but does not reject unauthenticated requests.
// Use for public endpoints that have enhanced behavior for authenticated users.
func OptionalAuthMiddleware(cfg *config.Config) fiber.Handler {
	secret := []byte(cfg.JWTSecret)

	return func(c *fiber.Ctx) error {
		var tokenStr string
		if auth := c.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
			tokenStr = strings.TrimPrefix(auth, "Bearer ")
		}
		if tokenStr == "" {
			tokenStr = c.Cookies(cfg.SessionCookie)
		}

		if tokenStr == "" {
			return c.Next()
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return secret, nil
		})

		if err == nil && token.Valid {
			c.Locals("claims", claims)
			c.Locals("userID", claims.UserID)
		}

		return c.Next()
	}
}

// RequireRole is a middleware factory that asserts the caller has the required role.
// Must be used after AuthMiddleware.
func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*Claims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authentication required",
			})
		}
		if claims.Role != role && claims.Role != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}
		return c.Next()
	}
}
