package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration

	// Backend proxy target
	BackendURL string

	// JWT
	JWTSecret     string
	JWTExpiry     time.Duration
	JWTIssuer     string
	JWTAudience   string
	SessionCookie string

	// Rate limiting
	RateLimitRPS   int
	RateLimitBurst int

	// CORS
	AllowedOrigins []string

	// TLS / HSTS
	HSTSMaxAge            int
	TLSCertFile           string
	TLSKeyFile            string

	// New Relic
	NewRelicLicense string
	NewRelicAppName string

	// Redis (optional, for distributed rate limiting)
	RedisAddr string
	RedisPass string

	// Logging
	LogLevel  string
	LogFormat string // "json" | "text"

	// Agent hub
	AgentCount int

	// Execution
	MaxOrderQueueSize int

	// Blockchain RPC overrides (optional)
	EthRPCURL     string
	PolygonRPCURL string
	ArbitrumRPCURL string
	BaseRPCURL    string
	BSCRPCURL     string
	AvalancheRPCURL string
	OptimismRPCURL  string
	SolanaRPCURL    string

	// Chainlink price feed (mainnet aggregator registry)
	ChainlinkRegistryAddress string
}

// Load reads config from environment variables with sane defaults.
func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "3000"),
		ReadTimeout:     getDuration("READ_TIMEOUT", 15*time.Second),
		WriteTimeout:    getDuration("WRITE_TIMEOUT", 15*time.Second),
		IdleTimeout:     getDuration("IDLE_TIMEOUT", 60*time.Second),
		ShutdownTimeout: getDuration("SHUTDOWN_TIMEOUT", 30*time.Second),

		BackendURL: getEnv("BACKEND_URL", "http://localhost:8000"),

		JWTSecret:     getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:     getDuration("JWT_EXPIRY", 24*time.Hour),
		JWTIssuer:     getEnv("JWT_ISSUER", "home-for-ai-gateway"),
		JWTAudience:   getEnv("JWT_AUDIENCE", "home-for-ai"),
		SessionCookie: getEnv("SESSION_COOKIE", "__Host-session"),

		RateLimitRPS:   getInt("RATE_LIMIT_RPS", 100),
		RateLimitBurst: getInt("RATE_LIMIT_BURST", 200),

		AllowedOrigins: []string{
			getEnv("ALLOWED_ORIGIN_1", "https://homeforai.com"),
			getEnv("ALLOWED_ORIGIN_2", "https://app.homeforai.com"),
		},

		HSTSMaxAge:  getInt("HSTS_MAX_AGE", 31536000),
		TLSCertFile: getEnv("TLS_CERT_FILE", ""),
		TLSKeyFile:  getEnv("TLS_KEY_FILE", ""),

		NewRelicLicense: getEnv("NEW_RELIC_LICENSE_KEY", ""),
		NewRelicAppName: getEnv("NEW_RELIC_APP_NAME", "home-for-ai-gateway"),

		RedisAddr: getEnv("REDIS_ADDR", ""),
		RedisPass: getEnv("REDIS_PASS", ""),

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),

		AgentCount:        getInt("AGENT_COUNT", 8),
		MaxOrderQueueSize: getInt("MAX_ORDER_QUEUE_SIZE", 10000),

		EthRPCURL:                getEnv("ETH_RPC_URL", "https://eth.llamarpc.com"),
		PolygonRPCURL:            getEnv("POLYGON_RPC_URL", "https://polygon.llamarpc.com"),
		ArbitrumRPCURL:           getEnv("ARBITRUM_RPC_URL", "https://arbitrum.llamarpc.com"),
		BaseRPCURL:               getEnv("BASE_RPC_URL", "https://base.llamarpc.com"),
		BSCRPCURL:                getEnv("BSC_RPC_URL", "https://bsc.publicnode.com"),
		AvalancheRPCURL:          getEnv("AVALANCHE_RPC_URL", "https://avalanche.publicnode.com/ext/bc/C/rpc"),
		OptimismRPCURL:           getEnv("OPTIMISM_RPC_URL", "https://optimism.llamarpc.com"),
		SolanaRPCURL:             getEnv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
		ChainlinkRegistryAddress: getEnv("CHAINLINK_REGISTRY", "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
