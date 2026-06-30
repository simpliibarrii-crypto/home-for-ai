package gateway

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	fws "github.com/gofiber/websocket/v2"
	"github.com/rs/zerolog/log"
)

// Message is the envelope pushed to WebSocket clients.
type Message struct {
	Type    string      `json:"type"`
	AgentID string      `json:"agent_id,omitempty"`
	Payload interface{} `json:"payload"`
	At      time.Time   `json:"at"`
}

// client represents a connected WebSocket subscriber.
type client struct {
	id   string
	conn *fws.Conn
	send chan Message
	done chan struct{}
}

// Hub manages the fan-out broadcast to all connected WebSocket clients.
// Every agent state update or market event is pushed to all subscribers.
type Hub struct {
	mu         sync.RWMutex
	clients    map[string]*client
	broadcast  chan Message
	register   chan *client
	unregister chan *client
}

// NewHub creates and starts a WebSocket hub.
func NewHub() *Hub {
	h := &Hub{
		clients:    make(map[string]*client),
		broadcast:  make(chan Message, 512),
		register:   make(chan *client, 64),
		unregister: make(chan *client, 64),
	}
	go h.run()
	return h
}

// run is the hub's main event loop. Runs in a dedicated goroutine.
func (h *Hub) run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c.id] = c
			h.mu.Unlock()
			log.Info().Str("client_id", c.id).Int("total", h.clientCount()).Msg("ws: client connected")

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c.id]; ok {
				delete(h.clients, c.id)
				close(c.send)
			}
			h.mu.Unlock()
			log.Info().Str("client_id", c.id).Int("total", h.clientCount()).Msg("ws: client disconnected")

		case msg := <-h.broadcast:
			h.mu.RLock()
			for _, c := range h.clients {
				select {
				case c.send <- msg:
				default:
					// Slow client — drop message to prevent back-pressure
					log.Warn().Str("client_id", c.id).Msg("ws: dropped message for slow client")
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast pushes a message to all connected clients (non-blocking).
func (h *Hub) Broadcast(msg Message) {
	msg.At = time.Now()
	select {
	case h.broadcast <- msg:
	default:
		log.Warn().Msg("ws: broadcast channel full, dropping message")
	}
}

// ClientCount returns the number of connected clients.
func (h *Hub) clientCount() int {
	return len(h.clients)
}

// WSUpgradeMiddleware checks that the request is a WebSocket upgrade before
// allowing through to the WebSocket handler.
func WSUpgradeMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if fws.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// WSHandler returns the Fiber WebSocket handler that connects clients to the Hub.
// Each client gets its own goroutine for writing messages.
func WSHandler(hub *Hub) fiber.Handler {
	return fws.New(func(conn *fws.Conn) {
		userID, _ := conn.Locals("userID").(string)
		if userID == "" {
			userID = "anon-" + conn.RemoteAddr().String()
		}

		c := &client{
			id:   userID,
			conn: conn,
			send: make(chan Message, 256),
			done: make(chan struct{}),
		}
		hub.register <- c

		// Goroutine: write messages from send channel to WebSocket
		go func() {
			defer func() {
				hub.unregister <- c
				conn.Close()
			}()
			for {
				select {
				case msg, ok := <-c.send:
					if !ok {
						// Channel closed → send WebSocket close frame
						conn.WriteMessage(fws.CloseMessage,
							fws.FormatCloseMessage(fws.CloseNormalClosure, ""))
						return
					}
					if err := conn.WriteJSON(msg); err != nil {
						log.Error().Err(err).Str("client_id", c.id).Msg("ws: write error")
						return
					}
				case <-c.done:
					return
				}
			}
		}()

		// Main loop: read from WebSocket (ping/pong keepalive; clients may send subscriptions)
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		conn.SetPongHandler(func(appData string) error {
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if fws.IsUnexpectedCloseError(err,
					fws.CloseGoingAway,
					fws.CloseNormalClosure,
					fws.CloseNoStatusReceived,
				) {
					log.Warn().Err(err).Str("client_id", c.id).Msg("ws: unexpected close")
				}
				break
			}
		}
		close(c.done)
	})
}
