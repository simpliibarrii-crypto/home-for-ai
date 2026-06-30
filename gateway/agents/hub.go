package agents

import (
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/simpliibarrii-crypto/home-for-ai-gateway/gateway"
)

// AgentStatus represents an agent's lifecycle state.
type AgentStatus string

const (
	AgentStatusIdle    AgentStatus = "IDLE"
	AgentStatusActive  AgentStatus = "ACTIVE"
	AgentStatusBusy    AgentStatus = "BUSY"
	AgentStatusError   AgentStatus = "ERROR"
	AgentStatusOffline AgentStatus = "OFFLINE"
)

// AgentType classifies the agent's domain responsibility.
type AgentType string

const (
	AgentTypeTrading    AgentType = "trading"
	AgentTypeRisk       AgentType = "risk"
	AgentTypeAnalysis   AgentType = "analysis"
	AgentTypeExecution  AgentType = "execution"
	AgentTypeCompliance AgentType = "compliance"
	AgentTypeReporting  AgentType = "reporting"
	AgentTypeMonitor    AgentType = "monitor"
	AgentTypePortfolio  AgentType = "portfolio"
)

// AgentCommand is a task dispatched to an agent.
type AgentCommand struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Payload   map[string]interface{} `json:"payload"`
	CreatedAt time.Time              `json:"created_at"`
	ReplyTo   chan AgentResult        `json:"-"`
}

// AgentResult is the output from an agent after processing a command.
type AgentResult struct {
	CommandID string      `json:"command_id"`
	AgentID   string      `json:"agent_id"`
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Duration  time.Duration `json:"duration_ms"`
}

// Agent represents a single autonomous agent with its own goroutine and channel.
type Agent struct {
	ID       string
	Name     string
	Type     AgentType
	Status   AgentStatus
	Commands chan AgentCommand
	quit     chan struct{}
	hub      *gateway.Hub

	mu          sync.RWMutex
	lastSeen    time.Time
	taskCount   int64
	errorCount  int64
}

// AgentHub manages the registry of all agents and their lifecycle.
type AgentHub struct {
	mu     sync.RWMutex
	agents map[string]*Agent
	wsHub  *gateway.Hub
}

// NewAgentHub creates an AgentHub and registers the default 8 agents.
func NewAgentHub(wsHub *gateway.Hub) *AgentHub {
	h := &AgentHub{
		agents: make(map[string]*Agent),
		wsHub:  wsHub,
	}

	// Register the 8 core agents
	defaultAgents := []struct {
		id   string
		name string
		typ  AgentType
	}{
		{"agent-001", "TradingAgent", AgentTypeTrading},
		{"agent-002", "RiskAgent", AgentTypeRisk},
		{"agent-003", "AnalysisAgent", AgentTypeAnalysis},
		{"agent-004", "ExecutionAgent", AgentTypeExecution},
		{"agent-005", "ComplianceAgent", AgentTypeCompliance},
		{"agent-006", "ReportingAgent", AgentTypeReporting},
		{"agent-007", "MonitorAgent", AgentTypeMonitor},
		{"agent-008", "PortfolioAgent", AgentTypePortfolio},
	}

	for _, a := range defaultAgents {
		h.Register(a.id, a.name, a.typ)
	}

	return h
}

// Register creates a new agent and starts its processing goroutine.
func (h *AgentHub) Register(id, name string, agentType AgentType) *Agent {
	agent := &Agent{
		ID:       id,
		Name:     name,
		Type:     agentType,
		Status:   AgentStatusIdle,
		Commands: make(chan AgentCommand, 64),
		quit:     make(chan struct{}),
		hub:      h.wsHub,
		lastSeen: time.Now(),
	}

	h.mu.Lock()
	h.agents[id] = agent
	h.mu.Unlock()

	go agent.run()

	log.Info().
		Str("agent_id", id).
		Str("name", name).
		Str("type", string(agentType)).
		Msg("agent: registered and started")

	return agent
}

// Dispatch sends a command to the named agent.
func (h *AgentHub) Dispatch(agentID string, cmd AgentCommand) error {
	h.mu.RLock()
	agent, ok := h.agents[agentID]
	h.mu.RUnlock()

	if !ok {
		return fmt.Errorf("agent %q not found", agentID)
	}

	select {
	case agent.Commands <- cmd:
		return nil
	default:
		return fmt.Errorf("agent %q command queue full", agentID)
	}
}

// ListAgents returns a snapshot of all agent states.
func (h *AgentHub) ListAgents() []*AgentInfo {
	h.mu.RLock()
	defer h.mu.RUnlock()

	infos := make([]*AgentInfo, 0, len(h.agents))
	for _, a := range h.agents {
		infos = append(infos, a.Info())
	}
	return infos
}

// AgentInfo is a read-only view of agent state (safe to serialize).
type AgentInfo struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	Type       AgentType   `json:"type"`
	Status     AgentStatus `json:"status"`
	LastSeen   time.Time   `json:"last_seen"`
	TaskCount  int64       `json:"task_count"`
	ErrorCount int64       `json:"error_count"`
}

// Info returns a thread-safe snapshot of the agent.
func (a *Agent) Info() *AgentInfo {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return &AgentInfo{
		ID:         a.ID,
		Name:       a.Name,
		Type:       a.Type,
		Status:     a.Status,
		LastSeen:   a.lastSeen,
		TaskCount:  a.taskCount,
		ErrorCount: a.errorCount,
	}
}

// run is the agent's main processing loop. Each agent owns its goroutine.
func (a *Agent) run() {
	log.Debug().Str("agent_id", a.ID).Msg("agent: loop started")

	for {
		select {
		case cmd := <-a.Commands:
			a.handleCommand(cmd)

		case <-a.quit:
			a.setStatus(AgentStatusOffline)
			log.Info().Str("agent_id", a.ID).Msg("agent: stopped")
			return
		}
	}
}

// handleCommand processes a single command with panic recovery.
func (a *Agent) handleCommand(cmd AgentCommand) {
	start := time.Now()
	a.setStatus(AgentStatusBusy)

	defer func() {
		if r := recover(); r != nil {
			a.mu.Lock()
			a.errorCount++
			a.mu.Unlock()
			a.setStatus(AgentStatusError)
			log.Error().
				Interface("panic", r).
				Str("agent_id", a.ID).
				Str("cmd_type", cmd.Type).
				Msg("agent: panic in command handler")

			if cmd.ReplyTo != nil {
				cmd.ReplyTo <- AgentResult{
					CommandID: cmd.ID,
					AgentID:   a.ID,
					Success:   false,
					Error:     fmt.Sprintf("panic: %v", r),
					Duration:  time.Since(start),
				}
			}
		}
	}()

	result := a.processCommand(cmd)
	result.Duration = time.Since(start)

	a.mu.Lock()
	a.taskCount++
	a.lastSeen = time.Now()
	if !result.Success {
		a.errorCount++
	}
	a.mu.Unlock()

	a.setStatus(AgentStatusIdle)

	// Push state update to WebSocket subscribers
	a.hub.Broadcast(gateway.Message{
		Type:    "agent.update",
		AgentID: a.ID,
		Payload: a.Info(),
	})

	if cmd.ReplyTo != nil {
		select {
		case cmd.ReplyTo <- result:
		default:
		}
	}

	log.Debug().
		Str("agent_id", a.ID).
		Str("cmd_id", cmd.ID).
		Bool("success", result.Success).
		Dur("duration", result.Duration).
		Msg("agent: command processed")
}

// processCommand executes the command business logic.
// Extend this with a type-switch for each command type your system supports.
func (a *Agent) processCommand(cmd AgentCommand) AgentResult {
	// Simulate processing — replace with real domain logic
	log.Info().
		Str("agent_id", a.ID).
		Str("cmd_type", cmd.Type).
		Msg("agent: executing command")

	return AgentResult{
		CommandID: cmd.ID,
		AgentID:   a.ID,
		Success:   true,
		Data: map[string]interface{}{
			"agent": a.Name,
			"type":  cmd.Type,
			"msg":   "command processed by " + a.Name,
		},
	}
}

// setStatus updates the agent status and publishes to the WebSocket hub.
func (a *Agent) setStatus(status AgentStatus) {
	a.mu.Lock()
	a.Status = status
	a.lastSeen = time.Now()
	a.mu.Unlock()
}

// Stop gracefully shuts down the agent.
func (a *Agent) Stop() {
	close(a.quit)
}
