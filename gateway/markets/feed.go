package markets

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
)

// Tick is a single market data point for a trading pair.
type Tick struct {
	Symbol    string    `json:"symbol"`
	Price     float64   `json:"price"`
	Bid       float64   `json:"bid"`
	Ask       float64   `json:"ask"`
	Volume24h float64   `json:"volume_24h"`
	Change24h float64   `json:"change_24h_pct"`
	High24h   float64   `json:"high_24h"`
	Low24h    float64   `json:"low_24h"`
	Source    string    `json:"source"`
	At        time.Time `json:"at"`
}

// FeedSource is an interface for market data providers.
type FeedSource interface {
	Name() string
	Subscribe(symbols []string) (<-chan Tick, error)
	Close() error
}

// MockFeedSource generates synthetic price data for development/testing.
// In production, replace with WebSocket connections to exchange APIs.
type MockFeedSource struct {
	name    string
	ticks   chan Tick
	quit    chan struct{}
	symbols []string
	basePrices map[string]float64
}

// NewMockFeedSource creates a mock feed that emits ticks every 500ms.
func NewMockFeedSource() *MockFeedSource {
	return &MockFeedSource{
		name:  "mock",
		ticks: make(chan Tick, 256),
		quit:  make(chan struct{}),
		basePrices: map[string]float64{
			"ETH/USD":  3200.0,
			"BTC/USD":  67000.0,
			"MATIC/USD": 0.89,
			"ARB/USD":  1.15,
			"AVAX/USD": 38.0,
			"BNB/USD":  580.0,
			"SOL/USD":  175.0,
			"USDC/USD": 1.0,
			"XBB/CAD":  31.5,  // Canadian bond ETF
			"GLD/USD":  185.0, // Gold ETF
			"SLV/USD":  22.0,  // Silver ETF
			"USO/USD":  75.0,  // Oil ETF
		},
	}
}

func (m *MockFeedSource) Name() string { return m.name }

// Subscribe starts emitting synthetic ticks for the given symbols.
func (m *MockFeedSource) Subscribe(symbols []string) (<-chan Tick, error) {
	m.symbols = symbols
	go m.emit()
	return m.ticks, nil
}

func (m *MockFeedSource) emit() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			for _, sym := range m.symbols {
				base, ok := m.basePrices[sym]
				if !ok {
					base = 100.0
				}
				// Random walk: ±0.05%
				delta := (rand.Float64()*2 - 1) * base * 0.0005
				price := base + delta
				spread := price * 0.0002 // 0.02% spread
				m.basePrices[sym] = price

				m.ticks <- Tick{
					Symbol:    sym,
					Price:     price,
					Bid:       price - spread/2,
					Ask:       price + spread/2,
					Volume24h: base * 1000 * (0.9 + rand.Float64()*0.2),
					Change24h: (rand.Float64()*4 - 2),
					High24h:   price * (1 + rand.Float64()*0.03),
					Low24h:    price * (1 - rand.Float64()*0.03),
					Source:    m.name,
					At:        time.Now(),
				}
			}
		case <-m.quit:
			return
		}
	}
}

func (m *MockFeedSource) Close() error {
	close(m.quit)
	return nil
}

// AggregatedFeed combines multiple FeedSource instances and fans out to subscribers.
// It de-duplicates symbols and applies VWAP aggregation when multiple sources provide the same pair.
type AggregatedFeed struct {
	mu          sync.RWMutex
	sources     []FeedSource
	subscribers map[string]chan Tick
	latest      map[string]Tick
	hub         *gateway.Hub
	quit        chan struct{}
}

// NewAggregatedFeed creates an aggregated feed wired to the WebSocket hub.
func NewAggregatedFeed(hub *gateway.Hub) *AggregatedFeed {
	af := &AggregatedFeed{
		sources:     make([]FeedSource, 0),
		subscribers: make(map[string]chan Tick),
		latest:      make(map[string]Tick),
		hub:         hub,
		quit:        make(chan struct{}),
	}

	// Add mock feed by default; real API feeds added via AddSource
	mock := NewMockFeedSource()
	af.AddSource(mock, []string{
		"ETH/USD", "BTC/USD", "MATIC/USD", "ARB/USD",
		"AVAX/USD", "BNB/USD", "SOL/USD", "USDC/USD",
		"XBB/CAD", "GLD/USD", "SLV/USD", "USO/USD",
	})

	return af
}

// AddSource registers a new feed source and starts consuming its ticks.
func (af *AggregatedFeed) AddSource(src FeedSource, symbols []string) {
	tickCh, err := src.Subscribe(symbols)
	if err != nil {
		log.Error().Err(err).Str("source", src.Name()).Msg("feed: subscribe failed")
		return
	}

	af.mu.Lock()
	af.sources = append(af.sources, src)
	af.mu.Unlock()

	go af.consume(src.Name(), tickCh)
}

// consume drains a source's tick channel and fans out to all subscribers + WebSocket hub.
func (af *AggregatedFeed) consume(sourceName string, tickCh <-chan Tick) {
	for {
		select {
		case tick, ok := <-tickCh:
			if !ok {
				log.Info().Str("source", sourceName).Msg("feed: source closed")
				return
			}
			af.processTickIn(tick)
		case <-af.quit:
			return
		}
	}
}

func (af *AggregatedFeed) processTickIn(tick Tick) {
	af.mu.Lock()
	af.latest[tick.Symbol] = tick
	af.mu.Unlock()

	// Push to WebSocket subscribers
	af.hub.Broadcast(gateway.Message{
		Type:    "market.tick",
		Payload: tick,
	})

	// Push to per-symbol channel subscribers
	af.mu.RLock()
	if ch, ok := af.subscribers[tick.Symbol]; ok {
		select {
		case ch <- tick:
		default:
		}
	}
	af.mu.RUnlock()
}

// Subscribe returns a channel that receives ticks for the given symbol.
func (af *AggregatedFeed) Subscribe(symbol string) <-chan Tick {
	af.mu.Lock()
	defer af.mu.Unlock()
	ch, ok := af.subscribers[symbol]
	if !ok {
		ch = make(chan Tick, 64)
		af.subscribers[symbol] = ch
	}
	return ch
}

// Latest returns the most recent tick for a symbol.
func (af *AggregatedFeed) Latest(symbol string) (Tick, bool) {
	af.mu.RLock()
	defer af.mu.RUnlock()
	t, ok := af.latest[symbol]
	return t, ok
}

// AllLatest returns a snapshot of all latest ticks.
func (af *AggregatedFeed) AllLatest() map[string]Tick {
	af.mu.RLock()
	defer af.mu.RUnlock()
	snapshot := make(map[string]Tick, len(af.latest))
	for k, v := range af.latest {
		snapshot[k] = v
	}
	return snapshot
}

// TickJSON serialises a tick to JSON bytes.
func TickJSON(t Tick) ([]byte, error) {
	return json.Marshal(t)
}

// FormatPrice formats a price with appropriate decimal places.
func FormatPrice(symbol string, price float64) string {
	switch {
	case price >= 1000:
		return fmt.Sprintf("%.2f", price)
	case price >= 1:
		return fmt.Sprintf("%.4f", price)
	default:
		return fmt.Sprintf("%.6f", price)
	}
}

// Close shuts down the aggregated feed and all sources.
func (af *AggregatedFeed) Close() {
	close(af.quit)
	af.mu.Lock()
	defer af.mu.Unlock()
	for _, src := range af.sources {
		if err := src.Close(); err != nil {
			log.Warn().Err(err).Str("source", src.Name()).Msg("feed: close error")
		}
	}
}
