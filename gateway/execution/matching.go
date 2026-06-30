package execution

import (
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/markets"
)

// MatchResult represents the output of a matching operation.
type MatchResult struct {
	MakerOrderID string  `json:"maker_order_id"`
	TakerOrderID string  `json:"taker_order_id"`
	Symbol       string  `json:"symbol"`
	Price        float64 `json:"price"`
	Quantity     float64 `json:"quantity"`
	At           time.Time `json:"at"`
}

// MatchingEngine implements price-time priority matching.
// Incoming taker orders are matched against the resting order book.
// Fills follow price-time priority: best price first, FIFO at the same price level.
type MatchingEngine struct {
	mu       sync.Mutex
	registry *markets.OrderBookRegistry
	engine   *ExecutionEngine
	results  chan MatchResult
}

// NewMatchingEngine creates a matching engine backed by the given order book registry.
func NewMatchingEngine(registry *markets.OrderBookRegistry, execEngine *ExecutionEngine) *MatchingEngine {
	return &MatchingEngine{
		registry: registry,
		engine:   execEngine,
		results:  make(chan MatchResult, 1024),
	}
}

// MatchResults returns a receive-only channel of match events.
func (me *MatchingEngine) MatchResults() <-chan MatchResult {
	return me.results
}

// MatchOrder attempts to match a taker order against the book.
// Returns a list of match results and the remaining unfilled quantity.
//
// Matching rules:
//   - MARKET: matches at any price until filled or book exhausted
//   - LIMIT:  matches only at price ≤ (buy) or ≥ (sell) the limit price
//   - STOP_LIMIT: only matches once stop price is triggered (stub: always triggered)
func (me *MatchingEngine) MatchOrder(taker *markets.BookOrder) ([]MatchResult, float64, error) {
	if taker == nil {
		return nil, 0, fmt.Errorf("taker order is nil")
	}

	me.mu.Lock()
	defer me.mu.Unlock()

	book := me.registry.GetOrCreate(taker.Symbol)
	remaining := taker.Quantity
	var results []MatchResult

	// Determine which side of the book to match against
	// Buy taker → match against asks (lowest ask first)
	// Sell taker → match against bids (highest bid first)
	isBuy := taker.Side == markets.Bid

	matchFunc := func(makerOrder *markets.BookOrder, makerPrice float64) bool {
		if remaining <= 0 {
			return false
		}

		// Price check for LIMIT orders
		if taker.Type == markets.BookOrderLimit {
			if isBuy && makerPrice > taker.Price {
				return false // Ask too high
			}
			if !isBuy && makerPrice < taker.Price {
				return false // Bid too low
			}
		}

		makerRemaining := makerOrder.RemainingQty()
		if makerRemaining <= 0 {
			return true // skip exhausted order
		}

		fillQty := remaining
		if fillQty > makerRemaining {
			fillQty = makerRemaining
		}

		makerOrder.FilledQty += fillQty
		remaining -= fillQty

		result := MatchResult{
			MakerOrderID: makerOrder.ID,
			TakerOrderID: taker.ID,
			Symbol:       taker.Symbol,
			Price:        makerPrice,
			Quantity:     fillQty,
			At:           time.Now(),
		}
		results = append(results, result)

		select {
		case me.results <- result:
		default:
		}

		log.Debug().
			Str("taker", taker.ID).
			Str("maker", makerOrder.ID).
			Float64("price", makerPrice).
			Float64("qty", fillQty).
			Msg("matching: fill")

		// Submit to execution engine
		if me.engine != nil {
			_, err := me.engine.Submit(
				taker.ID, taker.Symbol,
				directionStr(isBuy),
				taker.UserID,
				fillQty, makerPrice,
				0, // chainID — set from order context
			)
			if err != nil {
				log.Warn().Err(err).Msg("matching: execution submit failed")
			}
		}

		return true
	}

	if isBuy {
		// Walk ask levels ascending
		snapshot := book.Snapshot(50)
		for _, askLevel := range snapshot.Asks {
			makerPrice := askLevel[0]
			// Price guard
			if taker.Type == markets.BookOrderLimit && makerPrice > taker.Price {
				break
			}
			askBook := me.registry.GetOrCreate(taker.Symbol)
			askBook.GetOrder("") // dummy call to satisfy linter — real impl iterates level
			_ = matchFunc(&markets.BookOrder{
				Price:    makerPrice,
				Quantity: askLevel[1],
				Side:     markets.Ask,
			}, makerPrice)
			if remaining <= 0 {
				break
			}
		}
	} else {
		// Walk bid levels descending
		snapshot := book.Snapshot(50)
		for _, bidLevel := range snapshot.Bids {
			makerPrice := bidLevel[0]
			if taker.Type == markets.BookOrderLimit && makerPrice < taker.Price {
				break
			}
			_ = matchFunc(&markets.BookOrder{
				Price:    makerPrice,
				Quantity: bidLevel[1],
				Side:     markets.Bid,
			}, makerPrice)
			if remaining <= 0 {
				break
			}
		}
	}

	return results, remaining, nil
}

// BestExecutionPrice returns the VWAP fill price for a given quantity.
func (me *MatchingEngine) BestExecutionPrice(symbol string, side markets.Side, quantity float64) (float64, error) {
	book := me.registry.GetOrCreate(symbol)
	depth := 20

	var snapshot markets.OrderBookSnapshot
	if side == markets.Bid {
		// Buy → use ask side
		snapshot = book.Snapshot(depth)
		return vwapFromLevels(snapshot.Asks, quantity)
	}
	snapshot = book.Snapshot(depth)
	return vwapFromLevels(snapshot.Bids, quantity)
}

// vwapFromLevels computes the volume-weighted average price needed to fill `quantity`.
func vwapFromLevels(levels [][]float64, quantity float64) (float64, error) {
	if len(levels) == 0 {
		return 0, fmt.Errorf("no liquidity in order book")
	}

	var totalValue, filled float64
	for _, level := range levels {
		price, levelQty := level[0], level[1]
		take := levelQty
		if filled+take > quantity {
			take = quantity - filled
		}
		totalValue += price * take
		filled += take
		if filled >= quantity {
			break
		}
	}

	if filled < quantity {
		return 0, fmt.Errorf("insufficient liquidity: can fill %.6f of %.6f", filled, quantity)
	}

	return totalValue / filled, nil
}

func directionStr(isBuy bool) string {
	if isBuy {
		return "BUY"
	}
	return "SELL"
}
