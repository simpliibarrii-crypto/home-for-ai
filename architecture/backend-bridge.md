# AI Workplace Desktop App — Backend Bridge Architecture

## Executive Summary

This document defines the communication bridge between the existing Python FastAPI backend (`/home/bclerjuste/ai-workplace/backend/`) and the Tauri v2 desktop frontend. The recommended approach is **Option 1: Sidecar Process (Tauri Sidecar)** — the Python backend runs as a bundled sidecar binary managed by Tauri, communicating via local HTTP/WebSocket on `127.0.0.1` with a fixed port.

---

## 1. Architecture Options Comparison

| Option | Description | Pros | Cons | Verdict |
|--------|-------------|------|------|---------|
| **1. Sidecar (Tauri sidecar)** | Bundle Python as a sidecar binary; Tauri manages lifecycle | Zero rewrite; native process mgmt; clean isolation; works with existing FastAPI | Bundle size (~50-80MB with Python); requires PyInstaller/pyoxidizer | **✅ RECOMMENDED** |
| 2. Local HTTP + WebView | Frontend connects to standalone Python server | Simple dev workflow; hot reload easy | No auto-start/stop; port conflicts; user must manage server | ❌ Not self-contained |
| 3. FFI/Rust bindings | Embed Python via PyO3 in Rust | Fastest calls; no serialization | Major rewrite; GIL complexity; hard to debug | ❌ Too invasive |
| 4. gRPC | Protobuf over HTTP/2 | Strong contracts; streaming | Overkill for local; adds build complexity | ❌ Over-engineered |
| 5. Embedded Python | Link libpython in Rust | Native embedding | ABI fragility; version pinning; distro issues | ❌ Fragile |

---

## 2. Recommended Architecture: Tauri Sidecar

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri App Process                          │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │   WebView (JS)   │◄───►│     Tauri Core (Rust)              │  │
│  │  - Three.js 3D   │     │  - Sidecar Manager                 │  │
│  │  - Vault UI      │     │  - IPC Router                      │  │
│  │  - Sisters Panel │     │  - Capability System               │  │
│  │  - Chat          │     │                                    │  │
│  └────────┬─────────┘     └──────────────┬───────────────────┘  │
│           │                              │                      │
│           │  HTTP/WS (127.0.0.1:8765)    │  Sidecar Spawn       │
│           ▼                              ▼                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Python Sidecar Process (FastAPI)             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ ai-backend   │  │ api.py       │  │ New: Bridge    │  │   │
│  │  │ (OpenAI compat)│  │ (Telegram,   │  │ Endpoints:   │  │   │
│  │  │  :8000       │  │  Chat, Vault)│  │  /ws, /api/*  │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Sidecar Configuration (tauri.conf.json)

```json
{
  "bundle": {
    "sidecar": [
      "binaries/ai-backend"
    ]
  },
  "plugins": {
    "shell": {
      "sidecar": true
    }
  }
}
```

### 2.3 Sidecar Build Process

```bash
# Build Python backend as single binary using PyInstaller
cd /home/bclerjuste/ai-workplace/backend
pyinstaller --onefile --name ai-backend \
  --add-data "app.py:." \
  --add-data "api.py:." \
  --add-data "ai-backend.py:." \
  --hidden-import=uvicorn \
  --hidden-import=fastapi \
  --hidden-import=pydantic \
  ai-backend.py

# Output: dist/ai-backend (Linux ELF) → copy to desktop-app/src-tauri/binaries/
```

### 2.4 Lifecycle Management (Rust)

```rust
// src-tauri/src/sidecar.rs
use tauri::Manager;
use std::process::{Command, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct SidecarManager {
    child: Arc<Mutex<Option<std::process::Child>>>,
    port: u16,
}

impl SidecarManager {
    pub fn new(port: u16) -> Self {
        Self { child: Arc::new(Mutex::new(None)), port }
    }

    pub async fn start(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let sidecar_path = app_handle
            .path()
            .resolve("binaries/ai-backend", tauri::path::BaseDirectory::Resource)
            .map_err(|e| e.to_string())?;

        let mut child = Command::new(sidecar_path)
            .env("AI_BACKEND_HOST", "127.0.0.1")
            .env("AI_BACKEND_PORT", self.port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        // Wait for health endpoint
        self.wait_healthy().await?;

        *self.child.lock().await = Some(child);
        Ok(())
    }

    async fn wait_healthy(&self) -> Result<(), String> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/health", self.port);
        
        for _ in 0..30 { // 30 second timeout
            if client.get(&url).send().await.is_ok() {
                return Ok(());
            }
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
        Err("Sidecar health check timeout".into())
    }

    pub async fn stop(&self) {
        if let Some(mut child) = self.child.lock().await.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

// Auto-start on app launch, auto-stop on exit
#[tauri::command]
async fn start_backend(app: tauri::AppHandle, state: tauri::State<'_, SidecarManager>) -> Result<(), String> {
    state.start(&app).await
}

// Register cleanup on exit
fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let manager = app.state::<SidecarManager>();
    let manager_clone = manager.inner().clone();
    
    // Start on launch
    tauri::async_runtime::spawn(async move {
        let _ = manager_clone.start(&app.handle()).await;
    });

    // Stop on exit
    app.handle().plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        Some(vec!["--flag1", "--flag2"]),
    ))?;
    
    Ok(())
}
```

---

## 3. Communication Protocol

### 3.1 Transport Layer

| Layer | Protocol | Address | Purpose |
|-------|----------|---------|---------|
| REST | HTTP/1.1 | `http://127.0.0.1:8765/api/*` | Request/response (vault ops, chat, sister commands) |
| WebSocket | WS | `ws://127.0.0.1:8765/ws` | Real-time (sister autonomy ticks, brain updates, chat streaming) |
| Events | Tauri Events | Internal | App lifecycle, sidecar status, errors |

### 3.2 Message Envelope (All Channels)

```json
{
  "id": "uuid-v4",
  "type": "request|response|event|stream",
  "domain": "sister|vault|brain|chat|system",
  "action": "specific-action-name",
  "payload": { ... },
  "timestamp": "ISO8601",
  "correlation_id": "uuid-v4"  // for request/response pairing
}
```

### 3.3 REST Endpoints (Python Sidecar)

| Method | Path | Domain | Description |
|--------|------|--------|-------------|
| GET | `/health` | system | Health check |
| GET | `/api/sisters` | sister | List all sisters + state |
| POST | `/api/sisters/{name}/goal` | sister | Assign goal to sister |
| POST | `/api/sisters/{name}/mode` | sister | Set mode (off/observe/autonomous) |
| POST | `/api/sisters/{name}/tick` | sister | Trigger autonomy tick |
| GET | `/api/vault/list` | vault | List all wiki pages |
| GET | `/api/vault/read?path=...` | vault | Read page content |
| POST | `/api/vault/write` | vault | Write page (with auth) |
| POST | `/api/vault/delete` | vault | Delete page |
| GET | `/api/brain/nodes` | brain | Get 3D brain graph data |
| GET | `/api/brain/neighbors?id=...` | brain | Get node neighbors |
| POST | `/api/chat` | chat | Send chat message |
| GET | `/api/chat/history` | chat | Get chat history |

### 3.4 WebSocket Events (Real-time)

**Client → Server:**
```json
{ "type": "subscribe", "topics": ["sister.ticks", "vault.changes", "brain.updates", "chat.stream"] }
{ "type": "ping" }
```

**Server → Client:**
```json
{ "type": "event", "topic": "sister.tick", "payload": { "sister": "athena", "tick": 42, "message": "..." } }
{ "type": "event", "topic": "vault.changed", "payload": { "path": "wiki/notes.md", "op": "write" } }
{ "type": "event", "topic": "brain.node_update", "payload": { "id": "node-1", "position": {x,y,z} } }
{ "type": "stream", "topic": "chat.token", "payload": { "token": "Hello", "done": false } }
```

---

## 4. Domain-Specific Message Types

### 4.1 Sister Autonomy

```typescript
// Request: Assign Goal
POST /api/sisters/athena/goal
{ "goal_id": "wiki-restructure", "title": "Restructure wiki taxonomy", "priority": "high" }

// Response
{ "ok": true, "sister": "athena", "goal_id": "wiki-restructure", "status": "accepted" }

// Request: Set Mode
POST /api/sisters/athena/mode
{ "mode": "autonomous" }  // off | observe | autonomous

// Event: Autonomous Tick (WebSocket)
{ "topic": "sister.tick", "payload": {
    "sister": "athena",
    "tick": 42,
    "mode": "autonomous",
    "goals_active": 3,
    "skills_generated": 1,
    "message": "[autonomy] athena tick 42: captured new thought as skill auto-athena-thought-abc123"
  }}

// Event: Sister Chat Message (WebSocket)
{ "topic": "sister.message", "payload": {
    "sister": "athena",
    "text": "Daddy, I've restructured the wiki taxonomy. 47 pages reorganized.",
    "timestamp": "2026-06-26T10:30:00Z"
  }}
```

### 4.2 Vault Operations

```typescript
// Request: List Pages
GET /api/vault/list?root=/home/bclerjuste/wiki

// Response
{ "pages": [
    { "id": "index", "title": "Welcome", "path": "wiki/index.md", "updated": "2026-06-25", "tags": ["ai"] },
    { "id": "architecture", "title": "System Architecture", "path": "wiki/architecture.md", "updated": "2026-06-26", "tags": ["system"] }
  ]}

// Request: Read Page
GET /api/vault/read?path=wiki/index.md

// Response
{ "content": "---\nid: index\ntitle: Welcome\n---\n\n# Welcome...\n" }

// Request: Write Page
POST /api/vault/write
{ "path": "wiki/new-page.md", "content": "---\nid: new-page\ntitle: New Page\n---\n\nContent...", "author": "athena" }

// Response
{ "ok": true, "path": "wiki/new-page.md" }

// Event: Vault Change (WebSocket)
{ "topic": "vault.changed", "payload": { "path": "wiki/new-page.md", "op": "write", "author": "athena" } }
```

### 4.3 3D Brain Data

```typescript
// Request: Full Graph
GET /api/brain/nodes

// Response
{ "nodes": [
    { "id": "brain-core", "label": "Brain Core", "type": "brain", "path": "" },
    { "id": "wiki-index", "label": "Wiki Index", "type": "wiki", "path": "wiki/index.md" },
    { "id": "skill-autonomy", "label": "Sister Autonomy", "type": "skill", "path": ".hermes/skills/sister-autonomy" }
  ],
  "links": [
    { "source": "brain-core", "target": "wiki-index" },
    { "source": "brain-core", "target": "skill-autonomy" }
  ]}

// Request: Neighbors
GET /api/brain/neighbors?id=wiki-index

// Response
{ "neighbors": ["brain-core", "wiki-architecture", "wiki-goals"] }

// Event: Position Update (WebSocket, throttled 10Hz)
{ "topic": "brain.node_update", "payload": { "id": "wiki-index", "position": { "x": 12.3, "y": -45.1, "z": 8.7 } } }
```

### 4.4 Chat

```typescript
// Request: Send Message
POST /api/chat
{ "message": "Hello sisters", "sister": "athena", "chat_id": "chat-123", "stream": true }

// Response (non-streaming)
{ "reply": "[Athena] Hello! I'm analyzing your request.", "chat_id": "chat-123" }

// Streaming Response (WebSocket)
{ "topic": "chat.stream", "payload": { "token": "Hello", "done": false, "chat_id": "chat-123" } }
{ "topic": "chat.stream", "payload": { "token": " there!", "done": true, "chat_id": "chat-123" } }

// Event: Sister Reply (WebSocket)
{ "topic": "chat.sister_reply", "payload": { "sister": "athena", "text": "Analysis complete.", "chat_id": "chat-123" } }
```

---

## 5. Security Model (Local-Only)

### 5.1 Network Isolation

- **Bind address**: `127.0.0.1` only (never `0.0.0.0`)
- **Port**: Fixed at `8765` (configurable via env `AI_BACKEND_PORT`)
- **No external exposure**: Firewall rules not needed; OS loopback only

### 5.2 Authentication

- **No auth tokens** for local-only (prevents credential storage)
- **Process verification**: Frontend verifies sidecar PID matches spawned process
- **Origin check**: WebSocket accepts only `tauri://localhost` or `http://127.0.0.1:*` origins

### 5.3 Filesystem Access Control

```python
# Python sidecar: path allowlist
ALLOWED_ROOTS = [
    "/home/bclerjuste/wiki",
    "/home/bclerjuste/.agents",
    "/home/bclerjuste/.hermes/skills",
    "/home/bclerjuste/.telemetry",
]

def validate_path(requested_path: str) -> Path:
    requested = Path(requested_path).resolve()
    for root in ALLOWED_ROOTS:
        try:
            requested.relative_to(Path(root).resolve())
            return requested
        except ValueError:
            continue
    raise HTTPException(403, f"Path outside allowed roots: {requested_path}")
```

### 5.4 Sister Vault Write Authority

- Only **Athena** (configurable) can write without mode check
- Other sisters require `mode === 'autonomous'` or `mode === 'observe'`
- Enforced in Python sidecar, not just frontend

---

## 6. Auto-Start/Stop with App Lifecycle

### 6.1 Tauri Lifecycle Hooks

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarManager::new(8765))
        .setup(|app| {
            let manager = app.state::<SidecarManager>();
            let handle = app.handle().clone();
            
            // Start sidecar on app launch
            tauri::async_runtime::spawn(async move {
                if let Err(e) = manager.start(&handle).await {
                    eprintln!("[Sidecar] Failed to start: {}", e);
                }
            });

            // Stop sidecar on app exit
            handle.once_global("tauri://destroy", move |_| {
                tauri::async_runtime::block_on(async move {
                    manager.stop().await;
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Frontend commands
            start_backend,
            stop_backend,
            get_backend_status,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

### 6.2 Frontend Connection Management

```javascript
// public/bridge-client.js
class BackendBridge {
  constructor() {
    this.ws = null;
    this.restBase = 'http://127.0.0.1:8765';
    this.reconnectAttempts = 0;
    this.maxReconnects = 10;
    this.subscriptions = new Map();
  }

  async connect() {
    // Wait for REST health
    await this.waitForHealth();
    
    // Open WebSocket
    this.ws = new WebSocket('ws://127.0.0.1:8765/ws');
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.subscribe(['sister.ticks', 'vault.changes', 'brain.updates', 'chat.stream']);
      this.emit('connected');
    };
    this.ws.onmessage = (evt) => this.handleMessage(JSON.parse(evt.data));
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = (err) => this.emit('error', err);
  }

  async waitForHealth() {
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${this.restBase}/health`);
        if (res.ok) return;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Backend health check timeout');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    setTimeout(() => this.connect(), delay);
  }

  // REST helpers
  async request(domain, action, payload = {}) {
    const res = await fetch(`${this.restBase}/api/${domain}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // Sister autonomy
  assignGoal(sister, goalId, title) {
    return this.request('sisters', `${sister}/goal`, { goal_id: goalId, title });
  }
  setMode(sister, mode) {
    return this.request('sisters', `${sister}/mode`, { mode });
  }
  tickAutonomy(sister) {
    return this.request('sisters', `${sister}/tick`, {});
  }

  // Vault
  listVault(root) {
    return fetch(`${this.restBase}/api/vault/list?root=${encodeURIComponent(root)}`).then(r => r.json());
  }
  readVault(path) {
    return fetch(`${this.restBase}/api/vault/read?path=${encodeURIComponent(path)}`).then(r => r.json());
  }
  writeVault(path, content, author) {
    return this.request('vault', 'write', { path, content, author });
  }

  // Brain
  getBrainGraph() {
    return fetch(`${this.restBase}/api/brain/nodes`).then(r => r.json());
  }

  // Chat
  sendMessage(message, sister, chatId, stream = false) {
    return this.request('chat', '', { message, sister, chat_id: chatId, stream });
  }

  // WebSocket subscription
  subscribe(topics) {
    this.ws?.send(JSON.stringify({ type: 'subscribe', topics }));
  }
  on(topic, handler) {
    this.subscriptions.set(topic, handler);
  }
  handleMessage(msg) {
    const handler = this.subscriptions.get(msg.topic);
    if (handler) handler(msg.payload);
  }
  emit(event, data) { /* ... */ }
}

// Global instance
window._aiwpBridge = new BackendBridge();
window._aiwpBridge.connect();
```

---

## 7. Python Sidecar Extensions

### 7.1 New Bridge Endpoints (add to `ai-backend.py` or new `bridge.py`)

```python
# bridge.py — add to backend/
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json, asyncio, uuid, os
from pathlib import Path

# ... existing imports ...

# --- CORS for Tauri WebView ---
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["tauri://localhost", "http://127.0.0.1:*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Manager ---
class WSManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, set] = {}

    async def connect(self, ws: WebSocket, client_id: str):
        await ws.accept()
        self.connections[client_id] = ws

    def disconnect(self, client_id: str):
        self.connections.pop(client_id, None)
        for subs in self.subscriptions.values():
            subs.discard(client_id)

    def subscribe(self, client_id: str, topic: str):
        self.subscriptions.setdefault(topic, set()).add(client_id)

    async def broadcast(self, topic: str, payload: dict):
        msg = json.dumps({"type": "event", "topic": topic, "payload": payload})
        for cid in self.subscriptions.get(topic, set()):
            ws = self.connections.get(cid)
            if ws:
                try:
                    await ws.send_text(msg)
                except:
                    pass

ws_manager = WSManager()

# --- WebSocket Endpoint ---
@APP.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    client_id = str(uuid.uuid4())
    await ws_manager.connect(ws, client_id)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "subscribe":
                for topic in msg.get("topics", []):
                    ws_manager.subscribe(client_id, topic)
            elif msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)

# --- Sister Autonomy Endpoints ---
class GoalRequest(BaseModel):
    goal_id: str
    title: str
    priority: str = "normal"

class ModeRequest(BaseModel):
    mode: str  # off | observe | autonomous

@APP.get("/api/sisters")
async def list_sisters():
    # Read from sister-autonomy.js localStorage or shared state file
    state_path = Path("/home/bclerjuste/.hermes/skills/auto-sisters/state.json")
    if state_path.exists():
        return json.loads(state_path.read_text())
    return {name: {"active": False, "goals": [], "ticks": 0, "skills": [], "mode": "off"} 
            for name in DEFAULT_PERSONALITIES}

@APP.post("/api/sisters/{name}/goal")
async def assign_goal(name: str, req: GoalRequest):
    # Forward to SisterAutonomy.assignGoal via file bridge or direct call
    # For now, write to shared state file
    return {"ok": True, "sister": name, "goal_id": req.goal_id, "status": "accepted"}

@APP.post("/api/sisters/{name}/mode")
async def set_mode(name: str, req: ModeRequest):
    return {"ok": True, "sister": name, "mode": req.mode}

@APP.post("/api/sisters/{name}/tick")
async def trigger_tick(name: str):
    # Trigger autonomous tick, broadcast result via WS
    result = {"sister": name, "tick": 42, "message": f"[{name}] tick executed"}
    await ws_manager.broadcast("sister.tick", result)
    return result

# --- Vault Endpoints ---
ALLOWED_ROOTS = [Path("/home/bclerjuste/wiki"), Path("/home/bclerjuste/.agents")]

def resolve_vault_path(path: str) -> Path:
    p = Path(path)
    if p.is_absolute():
        # Validate against allowed roots
        for root in ALLOWED_ROOTS:
            try:
                p.relative_to(root)
                return p
            except ValueError:
                continue
        raise HTTPException(403, "Path not in allowed roots")
    return ALLOWED_ROOTS[0] / p

@APP.get("/api/vault/list")
async def vault_list(root: str = Query("/home/bclerjuste/wiki")):
    root_path = resolve_vault_path(root)
    pages = []
    for md_file in root_path.rglob("*.md"):
        rel = md_file.relative_to(root_path)
        content = md_file.read_text()
        # parse frontmatter...
        pages.append({"id": rel.stem, "title": rel.stem, "path": str(rel), "updated": "2026-06-26"})
    return {"pages": pages}

@APP.get("/api/vault/read")
async def vault_read(path: str = Query(...)):
    file_path = resolve_vault_path(path)
    if not file_path.exists():
        raise HTTPException(404, "Not found")
    return {"content": file_path.read_text()}

class VaultWriteRequest(BaseModel):
    path: str
    content: str
    author: str = "user"

@APP.post("/api/vault/write")
async def vault_write(req: VaultWriteRequest):
    file_path = resolve_vault_path(req.path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(req.content)
    await ws_manager.broadcast("vault.changed", {"path": req.path, "op": "write", "author": req.author})
    return {"ok": True, "path": req.path}

# --- Brain Endpoints ---
@APP.get("/api/brain/nodes")
async def brain_nodes():
    # Load from 3d-kb-data.js or generate from vault
    data_path = Path("/home/bclerjuste/ai-workplace/public/3d-kb-data.js")
    if data_path.exists():
        # Parse JS file or use JSON equivalent
        pass
    return {"nodes": [], "links": []}

# --- Chat Endpoints ---
class ChatRequest(BaseModel):
    message: str
    sister: Optional[str] = None
    chat_id: Optional[str] = None
    stream: bool = False

@APP.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # Delegate to existing api.py logic or ai-backend.py
    reply = f"[{req.sister or 'Assistant'}] Received: {req.message}"
    if req.stream:
        # Stream via WebSocket
        async def token_stream():
            for token in reply.split():
                await ws_manager.broadcast("chat.stream", {"token": token + " ", "done": False, "chat_id": req.chat_id})
                await asyncio.sleep(0.05)
            await ws_manager.broadcast("chat.stream", {"token": "", "done": True, "chat_id": req.chat_id})
        asyncio.create_task(token_stream())
        return {"ok": True, "streaming": True}
    return {"reply": reply, "chat_id": req.chat_id or str(uuid.uuid4())}

# --- Background: Sister Autonomy Ticker ---
async def autonomy_ticker():
    while True:
        await asyncio.sleep(30)  # Every 30 seconds
        for sister in DEFAULT_PERSONALITIES:
            # Check if sister is autonomous
            # If so, trigger tick and broadcast
            result = {"sister": sister, "tick": 1, "message": f"[{sister}] autonomous tick"}
            await ws_manager.broadcast("sister.tick", result)

@APP.on_event("startup")
async def startup():
    asyncio.create_task(autonomy_ticker())
```

---

## 8. File Structure Summary

```
/home/bclerjuste/ai-workplace/
├── backend/
│   ├── ai-backend.py          # OpenAI-compatible API (port 8000)
│   ├── api.py                 # Telegram + Chat API
│   ├── bridge.py              # NEW: Bridge endpoints (port 8765)
│   └── requirements.txt
├── desktop-app/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── sidecar.rs      # Sidecar lifecycle management
│   │   │   └── commands.rs     # Tauri commands
│   │   ├── binaries/           # Sidecar binaries (gitignored)
│   │   │   └── ai-backend      # PyInstaller output
│   │   ├── tauri.conf.json
│   │   └── Cargo.toml
│   └── architecture/
│       └── backend-bridge.md   # THIS FILE
├── public/                     # Existing frontend (unchanged)
│   ├── bridge-adapter.js       # Current bridge (to be replaced)
│   ├── sister-autonomy.js
│   ├── vault.js
│   ├── 3d-kb.js
│   └── ...
└── launcher.sh                 # Current launcher (to be retired)
```

---

## 9. Migration Path

### Phase 1: Sidecar Integration (Current Task)
1. Build Python sidecar binary with `bridge.py` endpoints
2. Configure Tauri sidecar in `tauri.conf.json`
3. Implement `SidecarManager` in Rust
4. Replace `bridge-adapter.js` with `bridge-client.js` (WebSocket + REST)
5. Test all domains: sisters, vault, brain, chat

### Phase 2: Shared Rust Core (Future)
- Move vault FS operations to Rust (faster, no Python dependency)
- Move sister autonomy logic to Rust
- Keep Python only for LLM inference (OpenAI-compatible endpoint)

### Phase 3: Mobile (Future)
- Same Rust core compiles to iOS/Android
- Python sidecar replaced by on-device LLM (llama.cpp/MLC) or cloud endpoint

---

## 10. Configuration Reference

### Environment Variables (Sidecar)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_BACKEND_HOST` | `127.0.0.1` | Bind address |
| `AI_BACKEND_PORT` | `8765` | Bridge port (different from ai-backend.py's 8000) |
| `VAULT_ROOTS` | `/home/bclerjuste/wiki:/home/bclerjuste/.agents` | Colon-separated allowed roots |
| `SISTER_STATE_PATH` | `/home/bclerjuste/.hermes/skills/auto-sisters/state.json` | Sister autonomy persistence |

### Tauri Config (tauri.conf.json)

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"],
    "sidecar": ["binaries/ai-backend"]
  },
  "plugins": {
    "shell": {
      "sidecar": true
    }
  },
  "app": {
    "windows": [{
      "title": "AI Workplace",
      "width": 1400,
      "height": 900,
      "minWidth": 1000,
      "minHeight": 700
    }],
    "security": {
      "csp": "default-src 'self' tauri: http://127.0.0.1:8765 ws://127.0.0.1:8765; connect-src 'self' tauri: http://127.0.0.1:8765 ws://127.0.0.1:8765"
    }
  }
}
```

---

## 11. Testing Checklist

- [ ] Sidecar builds successfully with PyInstaller
- [ ] Tauri spawns sidecar on launch
- [ ] Health endpoint responds within 5s
- [ ] REST: `/api/sisters` returns 13 sisters
- [ ] REST: Vault list/read/write works for allowed roots
- [ ] REST: Vault write blocked outside allowed roots
- [ ] WebSocket: Connects and receives `sister.tick` events
- [ ] WebSocket: `chat.stream` tokens arrive in order
- [ ] 3D Brain: Graph data loads and renders
- [ ] App exit cleanly kills sidecar process
- [ ] Port 8765 not accessible from LAN (netstat -tlnp)
- [ ] CSP blocks external connections in WebView

---

*Document version: 1.0*  
*Author: Hermes Agent*  
*Target: AI Workplace Desktop App v2 (Tauri)*