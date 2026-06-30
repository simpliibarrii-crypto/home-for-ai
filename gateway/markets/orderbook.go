package markets

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Side represents the bid or ask side of the order book.
type Side int

const (
	Bid Side = iota
	Ask
)

// BookOrderType enumerates order types in the book.
type BookOrderType string

const (
	BookOrderLimit     BookOrderType = "LIMIT"
	BookOrderMarket    BookOrderType = "MARKET"
	BookOrderStopLimit BookOrderType = "STOP_LIMIT"
)

// BookOrder is a single order entry in the order book.
type BookOrder struct {
	ID          string        `json:"id"`
	Symbol      string        `json:"symbol"`
	Side        Side          `json:"side"`    // 0=Bid, 1=Ask
	Type        BookOrderType `json:"type"`
	Price       float64       `json:"price"`
	StopPrice   float64       `json:"stop_price,omitempty"`
	Quantity    float64       `json:"quantity"`
	FilledQty   float64       `json:"filled_qty"`
	UserID      string        `json:"user_id"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// RemainingQty returns how much of the order is yet to be filled.
func (o *BookOrder) RemainingQty() float64 {
	return o.Quantity - o.FilledQty
}

// PriceLevel aggregates orders at the same price point.
type PriceLevel struct {
	Price  float64      `json:"price"`
	Orders []*BookOrder `json:"orders"`
}

// TotalQty sums all remaining quantities at this price level.
func (pl *PriceLevel) TotalQty() float64 {
	var total float64
	for _, o := range pl.Orders {
		total += o.RemainingQty()
	}
	return total
}

// OrderBookSnapshot is a serialisable view of the order book depth.
type OrderBookSnapshot struct {
	Symbol string       `json:"symbol"`
	Bids   [][]float64  `json:"bids"` // [[price, qty], ...]
	Asks   [][]float64  `json:"asks"` // [[price, qty], ...]
	At     time.Time    `json:"at"`
}

// OrderBook is a concurrent-safe in-memory order book for a single symbol.
// Uses sync.RWMutex for safe concurrent reads (market data consumers)
// and exclusive writes (order placement / cancellation).
type OrderBook struct {
	mu     sync.RWMutex
	symbol string

	// bids: price-descending (highest price first → best bid at front)
	bids map[float64]*PriceLevel
	// asks: price-ascending (lowest price first → best ask at front)
	asks map[float64]*PriceLevel

	// all active orders by ID for O(1) lookup
	orders map[string]*BookOrder
}

// NewOrderBook creates an empty order book for the given symbol.
func NewOrderBook(symbol string) *OrderBook {
	return &OrderBook{
		symbol: symbol,
		bids:   make(map[float64]*PriceLevel),
		asks:   make(map[float64]*PriceLevel),
		orders: make(map[string]*BookOrder),
	}
}

// AddOrder inserts a new limit or stop-limit order into the book.
// Market orders are not rested in the book; they should be matched immediately.
func (ob *OrderBook) AddOrder(order *BookOrder) error {
	if order.Type == BookOrderMarket {
		return fmt.Errorf("market orders must be matched immediately, not rested")
	}
	if order.Price <= 0 {
		return fmt.Errorf("order price must be positive")
	}
	if order.Quantity <= 0 {
		return fmt.Errorf("order quantity must be positive")
	}

	ob.mu.Lock()
	defer ob.mu.Unlock()

	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	ob.orders[order.ID] = order

	levels := ob.bids
	if order.Side == Ask {
		levels = ob.asks
	}
	level, ok := levels[order.Price]
	if !ok {
		level = &PriceLevel{Price: order.Price, Orders: make([]*BookOrder, 0)}
		levels[order.Price] = level
	}
	level.Orders = append(level.Orders, order)
	return nil
}

// CancelOrder removes an order from the book by ID.
func (ob *OrderBook) CancelOrder(orderID string) (*BookOrder, error) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	order, ok := ob.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("order %q not found", orderID)
	}

	levels := ob.bids
	if order.Side == Ask {
		levels = ob.asks
	}

	if level, ok := levels[order.Price]; ok {
		newOrders := make([]*BookOrder, 0, len(level.Orders)-1)
		for _, o := range level.Orders {
			if o.ID != orderID {
				newOrders = append(newOrders, o)
			}
		}
		level.Orders = newOrders
		if len(level.Orders) == 0 {
			delete(levels, order.Price)
		}
	}

	delete(ob.orders, orderID)
	return order, nil
}

// BestBid returns the highest bid price and total quantity, or 0,0 if no bids.
func (ob *OrderBook) BestBid() (price, qty float64) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	prices := ob.sortedBidPrices()
	if len(prices) == 0 {
		return 0, 0
	}
	best := prices[0]
	return best, ob.bids[best].TotalQty()
}

// BestAsk returns the lowest ask price and total quantity, or 0,0 if no asks.
func (ob *OrderBook) BestAsk() (price, qty float64) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	prices := ob.sortedAskPrices()
	if len(prices) == 0 {
		return 0, 0
	}
	best := prices[0]
	return best, ob.asks[best].TotalQty()
}

// Spread returns the bid-ask spread (best ask - best bid).
func (ob *OrderBook) Spread() float64 {
	bidPrice, _ := ob.BestBid()
	askPrice, _ := ob.BestAsk()
	if bidPrice == 0 || askPrice == 0 {
		return 0
	}
	return askPrice - bidPrice
}

// Snapshot returns a serialisable depth snapshot (top N levels).
func (ob *OrderBook) Snapshot(depth int) OrderBookSnapshot {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	bidPrices := ob.sortedBidPrices()
	askPrices := ob.sortedAskPrices()

	if depth > len(bidPrices) {
		depth = len(bidPrices)
	}
	bids := make([][]float64, 0, depth)
	for i := 0; i < depth && i < len(bidPrices); i++ {
		p := bidPrices[i]
		bids = append(bids, []float64{p, ob.bids[p].TotalQty()})
	}

	if depth > len(askPrices) {
		depth = len(askPrices)
	}
	asks := make([][]float64, 0, depth)
	for i := 0; i < depth && i < len(askPrices); i++ {
		p := askPrices[i]
		asks = append(asks, []float64{p, ob.asks[p].TotalQty()})
	}

	return OrderBookSnapshot{
		Symbol: ob.symbol,
		Bids:   bids,
		Asks:   asks,
		At:     time.Now(),
	}
}

// GetOrder returns an order by ID.
func (ob *OrderBook) GetOrder(id string) (*BookOrder, bool) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()
	o, ok := ob.orders[id]
	return o, ok
}

// sortedBidPrices returns bid prices sorted descending (best bid first).
// Caller must hold at least a read lock.
func (ob *OrderBook) sortedBidPrices() []float64 {
	prices := make([]float64, 0, len(ob.bids))
	for p := range ob.bids {
		prices = append(prices, p)
	}
	sort.Sort(sort.Reverse(sort.Float64Slice(prices)))
	return prices
}

// sortedAskPrices returns ask prices sorted ascending (best ask first).
func (ob *OrderBook) sortedAskPrices() []float64 {
	prices := make([]float64, 0, len(ob.asks))
	for p := range ob.asks {
		prices = append(prices, p)
	}
	sort.Float64Slice(prices).Sort()
	return prices
}

// OrderBookRegistry manages order books for multiple symbols.
type OrderBookRegistry struct {
	mu    sync.RWMutex
	books map[string]*OrderBook
}

// NewOrderBookRegistry creates a new registry.
func NewOrderBookRegistry() *OrderBookRegistry {
	return &OrderBookRegistry{
		books: make(map[string]*OrderBook),
	}
}

// GetOrCreate returns the order book for a symbol, creating it if necessary.
func (r *OrderBookRegistry) GetOrCreate(symbol string) *OrderBook {
	r.mu.RLock()
	ob, ok := r.books[symbol]
	r.mu.RUnlock()
	if ok {
		return ob
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	// Double-check after acquiring write lock
	if ob, ok = r.books[symbol]; ok {
		return ob
	}
	ob = NewOrderBook(symbol)
	r.books[symbol] = ob
	return ob
}

// All returns all registered order books.
func (r *OrderBookRegistry) All() map[string]*OrderBook {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make(map[string]*OrderBook, len(r.books))
	for k, v := range r.books {
		result[k] = v
	}
	return result
}
