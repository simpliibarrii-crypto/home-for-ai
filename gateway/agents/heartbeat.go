package agents

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
)

const (
	// HeartbeatInterval is the cadence at which pings are sent to agents.
	HeartbeatInterval = 5 * time.Second
	// HeartbeatTimeout is how long to wait for a pong before marking offline.
	HeartbeatTimeout = 15 * time.Second
	// ReconnectDelay is the backoff after a failed reconnect attempt.
	ReconnectDelay = 3 * time.Second
	// MaxReconnectAttempts before permanently marking agent offline.
	MaxReconnectAttempts = 5
)

// HeartbeatRecord tracks the ping/pong state for each agent.
type HeartbeatRecord struct {
	AgentID          string
	LastPing         time.Time
	LastPong         time.Time
	MissedPings      int
	ReconnectAttempts int
}

// HeartbeatManager runs a periodic ping/pong for every registered agent.
// On missed heartbeats it attempts reconnect up to MaxReconnectAttempts.
type HeartbeatManager struct {
	mu      sync.RWMutex
	records map[string]*HeartbeatRecord
	agentHub *AgentHub
	wsHub   *gateway.Hub
	cancel  context.CancelFunc
}

// NewHeartbeatManager creates and starts the heartbeat manager.
func NewHeartbeatManager(agentHub *AgentHub, wsHub *gateway.Hub) *HeartbeatManager {
	ctx, cancel := context.WithCancel(context.Background())
	hm := &HeartbeatManager{
		records:  make(map[string]*HeartbeatRecord),
		agentHub: agentHub,
		wsHub:    wsHub,
		cancel:   cancel,
	}

	// Initialise records for all existing agents
	for _, info := range agentHub.ListAgents() {
		hm.records[info.ID] = &HeartbeatRecord{
			AgentID:  info.ID,
			LastPing: time.Now(),
			LastPong: time.Now(),
		}
	}

	go hm.run(ctx)
	return hm
}

// run is the heartbeat loop. Fires every HeartbeatInterval.
func (hm *HeartbeatManager) run(ctx context.Context) {
	ticker := time.NewTicker(HeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			hm.pingAll()
		case <-ctx.Done():
			log.Info().Msg("heartbeat: manager stopped")
			return
		}
	}
}

// pingAll sends a heartbeat ping to every registered agent.
func (hm *HeartbeatManager) pingAll() {
	agentInfos := hm.agentHub.ListAgents()

	for _, info := range agentInfos {
		go hm.pingAgent(info)
	}
}

// pingAgent sends a ping and validates the pong response within HeartbeatTimeout.
func (hm *HeartbeatManager) pingAgent(info *AgentInfo) {
	// Send a ping command to the agent
	replyCh := make(chan AgentResult, 1)
	cmd := AgentCommand{
		ID:      "hb-" + info.ID + "-" + time.Now().Format("150405"),
		Type:    "heartbeat.ping",
		Payload: map[string]interface{}{"ts": time.Now().UnixMilli()},
		ReplyTo: replyCh,
	}

	err := hm.agentHub.Dispatch(info.ID, cmd)

	hm.mu.Lock()
	rec, ok := hm.records[info.ID]
	if !ok {
		rec = &HeartbeatRecord{AgentID: info.ID}
		hm.records[info.ID] = rec
	}
	rec.LastPing = time.Now()
	hm.mu.Unlock()

	if err != nil {
		hm.handleMissedPong(info.ID)
		return
	}

	// Wait for pong
	select {
	case result := <-replyCh:
		hm.mu.Lock()
		rec.LastPong = time.Now()
		if result.Success {
			rec.MissedPings = 0
			rec.ReconnectAttempts = 0
		}
		hm.mu.Unlock()

		log.Debug().
			Str("agent_id", info.ID).
			Dur("rtt", time.Since(rec.LastPing)).
			Msg("heartbeat: pong received")

		// Broadcast heartbeat update to WebSocket clients
		hm.wsHub.Broadcast(gateway.Message{
			Type:    "agent.heartbeat",
			AgentID: info.ID,
			Payload: map[string]interface{}{
				"agent_id": info.ID,
				"status":   "alive",
				"rtt_ms":   time.Since(rec.LastPing).Milliseconds(),
			},
		})

	case <-time.After(HeartbeatTimeout):
		hm.handleMissedPong(info.ID)
	}
}

// handleMissedPong increments the missed counter and triggers reconnect logic.
func (hm *HeartbeatManager) handleMissedPong(agentID string) {
	hm.mu.Lock()
	rec, ok := hm.records[agentID]
	if !ok {
		rec = &HeartbeatRecord{AgentID: agentID}
		hm.records[agentID] = rec
	}
	rec.MissedPings++
	missed := rec.MissedPings
	hm.mu.Unlock()

	log.Warn().
		Str("agent_id", agentID).
		Int("missed_pings", missed).
		Msg("heartbeat: missed pong")

	hm.wsHub.Broadcast(gateway.Message{
		Type:    "agent.heartbeat.missed",
		AgentID: agentID,
		Payload: map[string]interface{}{
			"agent_id":     agentID,
			"missed_pings": missed,
		},
	})

	if missed >= 3 {
		go hm.reconnectAgent(agentID)
	}
}

// reconnectAgent attempts to restart a non-responsive agent.
func (hm *HeartbeatManager) reconnectAgent(agentID string) {
	hm.mu.Lock()
	rec, ok := hm.records[agentID]
	if !ok {
		hm.mu.Unlock()
		return
	}
	rec.ReconnectAttempts++
	attempts := rec.ReconnectAttempts
	hm.mu.Unlock()

	if attempts > MaxReconnectAttempts {
		log.Error().
			Str("agent_id", agentID).
			Int("attempts", attempts).
			Msg("heartbeat: max reconnect attempts reached, agent marked offline")

		hm.wsHub.Broadcast(gateway.Message{
			Type:    "agent.offline",
			AgentID: agentID,
			Payload: map[string]interface{}{
				"agent_id": agentID,
				"reason":   "max reconnect attempts exceeded",
			},
		})
		return
	}

	log.Info().
		Str("agent_id", agentID).
		Int("attempt", attempts).
		Msg("heartbeat: attempting agent reconnect")

	time.Sleep(ReconnectDelay * time.Duration(attempts))

	// Look up agent info and re-register
	hm.agentHub.mu.RLock()
	agent, ok := hm.agentHub.agents[agentID]
	hm.agentHub.mu.RUnlock()

	if !ok {
		log.Warn().Str("agent_id", agentID).Msg("heartbeat: agent not in registry, cannot reconnect")
		return
	}

	// Re-register to restart the goroutine
	hm.agentHub.Register(agentID, agent.Name, agent.Type)

	hm.mu.Lock()
	rec.MissedPings = 0
	hm.mu.Unlock()

	hm.wsHub.Broadcast(gateway.Message{
		Type:    "agent.reconnected",
		AgentID: agentID,
		Payload: map[string]interface{}{
			"agent_id": agentID,
			"attempt":  attempts,
		},
	})

	log.Info().Str("agent_id", agentID).Msg("heartbeat: agent reconnected")
}

// Status returns all heartbeat records for observability.
func (hm *HeartbeatManager) Status() map[string]*HeartbeatRecord {
	hm.mu.RLock()
	defer hm.mu.RUnlock()
	snapshot := make(map[string]*HeartbeatRecord, len(hm.records))
	for k, v := range hm.records {
		cp := *v
		snapshot[k] = &cp
	}
	return snapshot
}

// Stop shuts down the heartbeat manager.
func (hm *HeartbeatManager) Stop() {
	hm.cancel()
}
