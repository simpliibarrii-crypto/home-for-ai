package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/config"
	"golang.org/x/time/rate"
)

// bucket holds a token-bucket limiter and its last-seen timestamp for TTL eviction.
type bucket struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// ipLimiterStore is a thread-safe map of IP address → token bucket.
type ipLimiterStore struct {
	mu      sync.RWMutex
	buckets map[string]*bucket
	rps     rate.Limit
	burst   int
}

func newIPLimiterStore(rps, burst int) *ipLimiterStore {
	s := &ipLimiterStore{
		buckets: make(map[string]*bucket),
		rps:     rate.Limit(rps),
		burst:   burst,
	}
	// Background goroutine: evict stale entries every 5 minutes.
	go s.cleanupLoop()
	return s
}

func (s *ipLimiterStore) get(key string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.buckets[key]
	if !ok {
		b = &bucket{
			limiter:  rate.NewLimiter(s.rps, s.burst),
			lastSeen: time.Now(),
		}
		s.buckets[key] = b
	}
	b.lastSeen = time.Now()
	return b.limiter
}

func (s *ipLimiterStore) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for key, b := range s.buckets {
			if b.lastSeen.Before(cutoff) {
				delete(s.buckets, key)
			}
		}
		s.mu.Unlock()
	}
}

// userLimiterStore is a token-bucket limiter keyed by authenticated user ID.
// Per-user limits are stricter to prevent abuse by authenticated clients.
type userLimiterStore struct {
	*ipLimiterStore
}

func newUserLimiterStore(rps, burst int) *userLimiterStore {
	return &userLimiterStore{newIPLimiterStore(rps, burst)}
}

// RateLimitMiddleware applies two-tier token-bucket rate limiting:
//  1. Per-IP:   cfg.RateLimitRPS tokens/s, burst cfg.RateLimitBurst
//  2. Per-User: half the IP limit (applied only to authenticated requests)
//
// Returns 429 with Retry-After header when either bucket is exhausted.
func RateLimitMiddleware(cfg *config.Config) fiber.Handler {
	ipStore := newIPLimiterStore(cfg.RateLimitRPS, cfg.RateLimitBurst)
	// Per-user budget: 50% of global IP budget — authenticated users get tighter per-user limits
	userStore := newUserLimiterStore(cfg.RateLimitRPS/2, cfg.RateLimitBurst/2)

	return func(c *fiber.Ctx) error {
		ip := c.IP()

		// Tier 1: IP-based rate limit
		if !ipStore.get(ip).Allow() {
			log.Warn().Str("ip", ip).Msg("ratelimit: IP limit exceeded")
			c.Set("Retry-After", "1")
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "rate limit exceeded",
				"retry_after": 1,
			})
		}

		// Tier 2: Per-user rate limit (only when authenticated)
		if userID, ok := c.Locals("userID").(string); ok && userID != "" {
			if !userStore.get(userID).Allow() {
				log.Warn().Str("user_id", userID).Msg("ratelimit: user limit exceeded")
				c.Set("Retry-After", "1")
				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":       "user rate limit exceeded",
					"retry_after": 1,
				})
			}
		}

		return c.Next()
	}
}

// StrictRateLimitMiddleware is used on sensitive endpoints (auth, transfer, sign).
// Uses 10 RPS / burst 20 regardless of global config.
func StrictRateLimitMiddleware() fiber.Handler {
	store := newIPLimiterStore(10, 20)
	return func(c *fiber.Ctx) error {
		if !store.get(c.IP()).Allow() {
			c.Set("Retry-After", "5")
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "strict rate limit exceeded on sensitive endpoint",
				"retry_after": 5,
			})
		}
		return c.Next()
	}
}
