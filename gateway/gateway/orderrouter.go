package gateway

import (
	"fmt"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// OrderType enumerates supported order types.
type OrderType string

const (
	OrderTypeLimit     OrderType = "LIMIT"
	OrderTypeMarket    OrderType = "MARKET"
	OrderTypeStopLimit OrderType = "STOP_LIMIT"
)

// OrderSide represents buy or sell.
type OrderSide string

const (
	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"
)

// OrderStatus tracks lifecycle state.
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "PENDING"
	OrderStatusQueued    OrderStatus = "QUEUED"
	OrderStatusExecuting OrderStatus = "EXECUTING"
	OrderStatusFilled    OrderStatus = "FILLED"
	OrderStatusCanceled  OrderStatus = "CANCELED"
	OrderStatusRejected  OrderStatus = "REJECTED"
)

// OrderRequest is the inbound order payload from clients.
type OrderRequest struct {
	Symbol    string    `json:"symbol"`                      // e.g. "ETH/USDC"
	Side      OrderSide `json:"side"`                        // BUY | SELL
	Type      OrderType `json:"type"`                        // LIMIT | MARKET | STOP_LIMIT
	Quantity  float64   `json:"quantity"`                    // asset quantity
	Price     float64   `json:"price,omitempty"`             // required for LIMIT & STOP_LIMIT
	StopPrice float64   `json:"stop_price,omitempty"`        // required for STOP_LIMIT
	ChainID   int64     `json:"chain_id,omitempty"`          // target chain (default: 1)
	UserID    string    `json:"user_id,omitempty"`           // filled by gateway from JWT
	TimeInForce string  `json:"time_in_force,omitempty"`     // GTC | IOC | FOK
}

// Order is the enriched, routable order object.
type Order struct {
	ID          string      `json:"id"`
	Request     OrderRequest `json:"request"`
	Status      OrderStatus `json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	FilledQty   float64     `json:"filled_qty"`
	FilledPrice float64     `json:"filled_price,omitempty"`
	Error       string      `json:"error,omitempty"`
}

// OrderQueue is a thread-safe, bounded FIFO queue for orders awaiting execution.
type OrderQueue struct {
	mu      sync.Mutex
	queue   chan *Order
	orders  map[string]*Order
	hub     *Hub
}

// NewOrderQueue creates a queue with the given capacity and wires it to the WebSocket hub.
func NewOrderQueue(capacity int, hub *Hub) *OrderQueue {
	oq := &OrderQueue{
		queue:  make(chan *Order, capacity),
		orders: make(map[string]*Order),
		hub:    hub,
	}
	go oq.dispatchLoop()
	return oq
}

// Enqueue validates and enqueues an order.
// Returns the created Order or an error if the queue is full or validation fails.
func (oq *OrderQueue) Enqueue(req OrderRequest) (*Order, error) {
	if err := validateOrderRequest(req); err != nil {
		return nil, err
	}

	order := &Order{
		ID:        uuid.New().String(),
		Request:   req,
		Status:    OrderStatusQueued,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	oq.mu.Lock()
	oq.orders[order.ID] = order
	oq.mu.Unlock()

	select {
	case oq.queue <- order:
		oq.hub.Broadcast(Message{
			Type:    "order.queued",
			Payload: order,
		})
		log.Info().Str("order_id", order.ID).Str("symbol", req.Symbol).Msg("order: queued")
		return order, nil
	default:
		// Queue full — reject immediately
		order.Status = OrderStatusRejected
		order.Error = "order queue at capacity"
		oq.mu.Lock()
		oq.orders[order.ID] = order
		oq.mu.Unlock()
		return order, fmt.Errorf("order queue at capacity")
	}
}

// GetOrder retrieves an order by ID.
func (oq *OrderQueue) GetOrder(id string) (*Order, bool) {
	oq.mu.Lock()
	defer oq.mu.Unlock()
	o, ok := oq.orders[id]
	return o, ok
}

// dispatchLoop reads orders from the queue and dispatches to the execution engine stub.
func (oq *OrderQueue) dispatchLoop() {
	for order := range oq.queue {
		oq.dispatch(order)
	}
}

// dispatch simulates order dispatch to the execution engine.
// In production this sends the order over gRPC / message queue to the execution service.
func (oq *OrderQueue) dispatch(order *Order) {
	oq.mu.Lock()
	order.Status = OrderStatusExecuting
	order.UpdatedAt = time.Now()
	oq.mu.Unlock()

	oq.hub.Broadcast(Message{
		Type:    "order.executing",
		Payload: order,
	})

	// Simulate execution latency (replace with real execution engine call)
	time.Sleep(50 * time.Millisecond)

	oq.mu.Lock()
	order.Status = OrderStatusFilled
	order.FilledQty = order.Request.Quantity
	order.FilledPrice = order.Request.Price
	order.UpdatedAt = time.Now()
	oq.mu.Unlock()

	oq.hub.Broadcast(Message{
		Type:    "order.filled",
		Payload: order,
	})

	log.Info().Str("order_id", order.ID).Str("status", string(order.Status)).Msg("order: dispatched")
}

// validateOrderRequest enforces business rules on incoming orders.
func validateOrderRequest(req OrderRequest) error {
	if req.Symbol == "" {
		return fmt.Errorf("symbol is required")
	}
	if req.Quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}
	switch req.Side {
	case OrderSideBuy, OrderSideSell:
	default:
		return fmt.Errorf("invalid side: %q", req.Side)
	}
	switch req.Type {
	case OrderTypeLimit, OrderTypeStopLimit:
		if req.Price <= 0 {
			return fmt.Errorf("price required for %s orders", req.Type)
		}
		if req.Type == OrderTypeStopLimit && req.StopPrice <= 0 {
			return fmt.Errorf("stop_price required for STOP_LIMIT orders")
		}
	case OrderTypeMarket:
		// Market orders don't require a price
	default:
		return fmt.Errorf("invalid order type: %q", req.Type)
	}
	return nil
}

// OrderRouterHandler returns a Fiber handler for POST /api/v1/orders
func OrderRouterHandler(oq *OrderQueue) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req OrderRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid request body",
			})
		}

		// Inject user ID from JWT claims
		if userID, ok := c.Locals("userID").(string); ok {
			req.UserID = userID
		}

		order, err := oq.Enqueue(req)
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		statusCode := fiber.StatusAccepted
		if order.Status == OrderStatusRejected {
			statusCode = fiber.StatusServiceUnavailable
		}
		return c.Status(statusCode).JSON(order)
	}
}

// GetOrderHandler returns a Fiber handler for GET /api/v1/orders/:id
func GetOrderHandler(oq *OrderQueue) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		order, ok := oq.GetOrder(id)
		if !ok {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "order not found",
			})
		}
		return c.JSON(order)
	}
}
