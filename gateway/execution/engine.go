package execution

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
)

// TradeState is the lifecycle state of a trade execution.
type TradeState string

const (
	TradeStatePending   TradeState = "PENDING"
	TradeStateFilled    TradeState = "FILLED"
	TradeStatePartial   TradeState = "PARTIAL"
	TradeStateSettling  TradeState = "SETTLING"
	TradeStateSettled   TradeState = "SETTLED"
	TradeStateRejected  TradeState = "REJECTED"
	TradeStateCanceled  TradeState = "CANCELED"
	TradeStateError     TradeState = "ERROR"
)

// Trade represents a matched and filled trade moving through the settlement pipeline.
type Trade struct {
	ID          string     `json:"id"`
	OrderID     string     `json:"order_id"`
	Symbol      string     `json:"symbol"`
	Side        string     `json:"side"`       // BUY | SELL
	Quantity    float64    `json:"quantity"`
	Price       float64    `json:"price"`
	Fee         float64    `json:"fee"`
	FeeCurrency string     `json:"fee_currency"`
	UserID      string     `json:"user_id"`
	ChainID     int64      `json:"chain_id"`
	TxHash      string     `json:"tx_hash,omitempty"`
	State       TradeState `json:"state"`
	StateHistory []StateTransition `json:"state_history"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	SettledAt   *time.Time `json:"settled_at,omitempty"`
	Error       string     `json:"error,omitempty"`
}

// StateTransition records a single state change with timestamp and reason.
type StateTransition struct {
	From      TradeState `json:"from"`
	To        TradeState `json:"to"`
	At        time.Time  `json:"at"`
	Reason    string     `json:"reason,omitempty"`
}

// transitionTo moves a trade to a new state, recording the transition.
func (t *Trade) transitionTo(newState TradeState, reason string) error {
	valid := validTransitions[t.State]
	allowed := false
	for _, s := range valid {
		if s == newState {
			allowed = true
			break
		}
	}
	if !allowed {
		return fmt.Errorf("invalid transition %s → %s", t.State, newState)
	}

	t.StateHistory = append(t.StateHistory, StateTransition{
		From:   t.State,
		To:     newState,
		At:     time.Now(),
		Reason: reason,
	})
	t.State = newState
	t.UpdatedAt = time.Now()
	return nil
}

// validTransitions defines the state machine graph.
var validTransitions = map[TradeState][]TradeState{
	TradeStatePending:  {TradeStateFilled, TradeStatePartial, TradeStateRejected, TradeStateCanceled},
	TradeStateFilled:   {TradeStateSettling, TradeStateError},
	TradeStatePartial:  {TradeStateFilled, TradeStateCanceled, TradeStateError},
	TradeStateSettling: {TradeStateSettled, TradeStateError},
	TradeStateSettled:  {}, // terminal
	TradeStateRejected: {}, // terminal
	TradeStateCanceled: {}, // terminal
	TradeStateError:    {TradeStatePending}, // allow retry from error
}

// ExecutionEngine runs the trade execution state machine.
// Transitions: PENDING → FILLED → SETTLING → SETTLED
type ExecutionEngine struct {
	mu       sync.RWMutex
	trades   map[string]*Trade
	pipeline chan *Trade
	hub      *gateway.Hub
	wg       sync.WaitGroup
	quit     chan struct{}
}

// NewExecutionEngine creates an engine with configurable pipeline depth.
func NewExecutionEngine(pipelineSize int, hub *gateway.Hub) *ExecutionEngine {
	e := &ExecutionEngine{
		trades:   make(map[string]*Trade),
		pipeline: make(chan *Trade, pipelineSize),
		hub:      hub,
		quit:     make(chan struct{}),
	}
	// Start worker pool
	workers := 4
	for i := 0; i < workers; i++ {
		e.wg.Add(1)
		go e.worker()
	}
	return e
}

// Submit creates a new trade in PENDING state and enqueues it for execution.
func (e *ExecutionEngine) Submit(
	orderID, symbol, side, userID string,
	quantity, price float64,
	chainID int64,
) (*Trade, error) {
	trade := &Trade{
		ID:           uuid.New().String(),
		OrderID:      orderID,
		Symbol:       symbol,
		Side:         side,
		Quantity:     quantity,
		Price:        price,
		Fee:          quantity * price * 0.001, // 0.1% fee
		FeeCurrency:  "USDC",
		UserID:       userID,
		ChainID:      chainID,
		State:        TradeStatePending,
		StateHistory: []StateTransition{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	e.mu.Lock()
	e.trades[trade.ID] = trade
	e.mu.Unlock()

	select {
	case e.pipeline <- trade:
		e.broadcast(trade)
		log.Info().Str("trade_id", trade.ID).Str("symbol", symbol).Msg("execution: trade submitted")
		return trade, nil
	default:
		return nil, fmt.Errorf("execution pipeline full")
	}
}

// GetTrade retrieves a trade by ID.
func (e *ExecutionEngine) GetTrade(id string) (*Trade, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	t, ok := e.trades[id]
	return t, ok
}

// worker processes trades through the state machine.
func (e *ExecutionEngine) worker() {
	defer e.wg.Done()
	for {
		select {
		case trade := <-e.pipeline:
			e.process(trade)
		case <-e.quit:
			return
		}
	}
}

// process drives a trade through PENDING → FILLED → SETTLING → SETTLED.
func (e *ExecutionEngine) process(trade *Trade) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Step 1: PENDING → FILLED
	if err := trade.transitionTo(TradeStateFilled, "order matched by engine"); err != nil {
		log.Error().Err(err).Str("trade_id", trade.ID).Msg("execution: fill transition failed")
		return
	}
	e.broadcastLocked(trade)

	// Step 2: FILLED → SETTLING (simulate blockchain submission)
	time.Sleep(10 * time.Millisecond)
	if err := trade.transitionTo(TradeStateSettling, "submitted to chain "+fmt.Sprint(trade.ChainID)); err != nil {
		log.Error().Err(err).Str("trade_id", trade.ID).Msg("execution: settling transition failed")
		trade.transitionTo(TradeStateError, "settling transition failed")
		return
	}
	trade.TxHash = fmt.Sprintf("0x%064x", trade.ID) // mock tx hash
	e.broadcastLocked(trade)

	// Step 3: SETTLING → SETTLED (simulate block confirmation)
	time.Sleep(50 * time.Millisecond)
	if err := trade.transitionTo(TradeStateSettled, "confirmed in block"); err != nil {
		log.Error().Err(err).Str("trade_id", trade.ID).Msg("execution: settled transition failed")
		return
	}
	now := time.Now()
	trade.SettledAt = &now
	e.broadcastLocked(trade)

	log.Info().
		Str("trade_id", trade.ID).
		Str("symbol", trade.Symbol).
		Float64("price", trade.Price).
		Str("tx_hash", trade.TxHash).
		Msg("execution: trade settled")
}

func (e *ExecutionEngine) broadcast(trade *Trade) {
	e.hub.Broadcast(gateway.Message{
		Type:    "trade.state." + string(trade.State),
		Payload: trade,
	})
}

func (e *ExecutionEngine) broadcastLocked(trade *Trade) {
	// Called with e.mu held — fire-and-forget to hub (hub has its own lock)
	e.hub.Broadcast(gateway.Message{
		Type:    "trade.state." + string(trade.State),
		Payload: trade,
	})
}

// Stop drains in-flight trades and shuts down workers.
func (e *ExecutionEngine) Stop() {
	close(e.quit)
	e.wg.Wait()
}
