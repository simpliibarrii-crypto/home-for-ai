# AI-First IDE Hybrids: Architecture Patterns Research

**Research Date:** June 27, 2026  
**Tools Analyzed:** Cursor, Continue.dev, Cody (Sourcegraph), GitHub Copilot, Zed AI, Windsurf  
**Focus Areas:** Editor + AI Chat + Search integration, Context Retrieval, Inline Edits, Multi-file Changes

---

## Executive Summary

The AI-first IDE landscape has converged on a **hybrid architecture** combining:
- **Editor core** (VS Code fork or native)
- **AI chat sidebar/panel** (context-aware conversation)
- **Inline completions** (Tab/ghost text)
- **Cmd/Ctrl+K inline editing** (targeted transformations)
- **Context retrieval** (RAG, code search, embeddings, LSP)
- **Multi-file change orchestration** (diff staging, checkpoints, agent workflows)

Each tool makes distinct architectural tradeoffs between **automation vs. control**, **local vs. cloud**, **plugin vs. fork**, and **implicit vs. explicit context**.

---

## 1. Cursor — AI-First VS Code Fork

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    CURSOR ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│  CLIENT (VS Code Fork)          │  BACKEND AI SERVICES      │
│  ─────────────────────          │  ─────────────────────    │
│  • Custom UI (Chat, Composer)   │  • LLM Orchestration      │
│  • Shadow Workspace             │  • Vector Database        │
│  • Language Server Integration  │  • Embedding Generation   │
│  • @ Symbol Context Insertion   │  • Caching & Routing      │
│  • Diff Application Engine      │  • Privacy Mode Handling  │
└─────────────────────────────────────────────────────────────┘
```

### Core Features

| Feature | Description | Shortcut |
|---------|-------------|----------|
| **AI Chat (Contextual)** | Sidebar chat aware of current file, cursor location, project context | Cmd+L |
| **Semantic Codebase Search** | Vector embedding-based search understanding query meaning | Cmd+Shift+F / @codebase |
| **Smart Refactoring & Multi-File Edits** | Natural language commands using dedicated edit model | Cmd+K / Composer |
| **Inline Completions (Tab)** | Predicts next logical edits, not just next token | Tab |
| **Cmd+K Editing** | On-demand code generation/editing on selected blocks | Cmd+K |

### Key Architectural Innovations

#### Shadow Workspace
- **Hidden background Electron window** mirroring the project
- AI applies edits in shadow workspace → LSP provides diagnostics → fed back to AI for correction
- **Independence**: User's coding experience completely unaffected
- **Future**: Kernel-level filesystem proxy (FUSE on Linux) for true disk isolation

#### Model Strategy: Dual-Model Orchestration
| Model Type | Purpose | Examples |
|------------|---------|----------|
| **Frontier Large Models** | Complex reasoning, chat | GPT-4, Claude 3.5 Sonnet |
| **Specialized Small Models** | Fast autocomplete, routine edits | Custom "Copilot++", "Fast Apply" (70B Llama, 1000+ tok/sec via speculative decoding) |

**Routing**: Task-to-model orchestration layer constructs prompts with system instructions + context.

#### Codebase Indexing & Semantic Embeddings
```
Source Files → Chunking (tree-sitter AST) → Embedding Generation → Vector DB Storage
```
- **Chunking**: Logical boundaries (functions, classes) via tree-sitter, few hundred tokens
- **Embeddings**: OpenAI or custom embedding model
- **RAG Flow**: Query → Embedding → Vector Search → Retrieved Chunks → LLM Prompt

#### Composer (Multi-File Edits) — Cursor 3
- **Explicit approval gates**: Preview-then-approve default, stages diffs per-file before write
- **Parallel Agents Panel**: Multiple agents (Research, Build, Test, Review) with per-agent scope/model/MCP
- **Design-driven Composer**: Image-to-component scaffolding (Figma → shadcn/Tailwind)
- **Checkpoints**: Restore to pre-edit state at any point

#### @-Mention Context System
- `@file` — Include specific file
- `@codebase` — Semantic search across project
- `@web` — Web search integration
- `@docs` — Documentation references
- `@terminal` — Terminal output
- `@git` — Git diff/history

---

## 2. Continue.dev — Open-Source Plugin for VS Code + JetBrains

### Architecture Philosophy
- **Plugin-based** (not fork) — sits inside existing IDEs
- **Configuration-driven**: Single `config.yaml` controls everything
- **Apache 2.0** — fully forkable, auditable, self-hostable
- **Model routing via explicit roles** — no vendor lock-in

### Configuration (`~/.continue/config.yaml`)
```yaml
models:
  - name: Claude Sonnet 4.6
    provider: anthropic
    model: claude-sonnet-4-6-20260115
    roles: [chat, edit, apply]           # Frontier model for reasoning
  - name: Qwen3-Coder · local
    provider: ollama
    model: qwen3-coder:32b
    roles: [autocomplete, apply]         # Fast local model for hot path
  - name: nomic-embed · local
    provider: ollama
    model: nomic-embed-text
    roles: [embed]                       # Local embeddings for indexing

context:
  - provider: "code"                     # Codebase context
  - provider: "docs"                     # Documentation
  - provider: "diff"                     # Git diff
  - provider: "terminal"                 # Terminal output
  - provider: "open"                     # Open files

prompts:                                 # Slash commands
  - name: "code-review"
    prompt: "..."
    context: ["code", "diff"]

mcpServers:                              # MCP connections
  - name: "database"
    command: "npx"
    args: ["-y", "@anthropic/mcp-server-postgres"]
```

### Model Routing via Roles
| Role | Purpose | Recommended Model |
|------|---------|-------------------|
| `chat` | General conversation | Frontier (Claude, GPT-4) |
| `edit` | Inline editing (Cmd+K) | Frontier or strong mid-size |
| `apply` | Diff application | Fast local (7B-32B) |
| `autocomplete` | Ghost text completions | **Always small/fast/cheap local** (7B-32B) |
| `embed` | Codebase indexing | Local embedding model |
| `rerank` | Context re-ranking | Lightweight reranker |

### Context Providers
- **Code**: Codebase search via embeddings or keyword
- **Docs**: Documentation fetching
- **Diff**: Git changes
- **Terminal**: Command output
- **Open**: Currently open files
- **Problems**: LSP diagnostics
- **Custom**: User-defined providers

### Key Features
| Feature | Shortcut | Description |
|---------|----------|-------------|
| **Inline Edit** | Cmd+I | Select code, describe changes, diff streamed inline |
| **Chat** | Cmd+L | Sidebar chat with context providers |
| **Autocomplete** | Tab | Ghost text completions |
| **Slash Commands** | / | Custom prompt templates + context selectors |
| **Next Edit** | — | Predictive next edit location |

### Tradeoffs
| Advantage | Limitation |
|-----------|------------|
| Full control over models, context, privacy | Requires configuration investment |
| Self-hosted (Ollama/vLLM), zero outbound | Less out-of-the-box polish |
| Cost-effective at scale (no per-seat) | Thinner agent scaffolding vs. Cursor/Claude Code |
| Works in VS Code + JetBrains | JetBrains plugin has some context provider gaps |

---

## 3. Cody (Sourcegraph) — Enterprise Code Intelligence Platform

### Architecture: Product of Products
Cody combines multiple features with different context requirements:

| Feature | Primary Goal | Key Requirement |
|---------|-------------|-----------------|
| **Autocomplete** | Keep developer in flow | **Speed** (latency budget critical) |
| **Chat** | Answer questions, generate code | **Accuracy & quality** |
| **Test Generation** | Create/maintain test files | Detect conventions, follow patterns |
| **Code Editing** | Inline natural-language edits | Surrounding context + diagnostics |

### Context Retrieval: RAG + Sourcegraph Search (Not Embeddings)

**Why Cody moved away from embeddings:**
| Issue | Impact |
|-------|--------|
| 3rd-party code exposure | Source sent to OpenAI for embedding — unacceptable for enterprises |
| Operational complexity | Embeddings require creation, storage, maintenance |
| Scalability limits | Vector DBs complex at >100K repos; blocked multi-repo context |

**New approach: Sourcegraph's native search platform**
- ✅ No code sent to 3rd parties
- ✅ Zero additional configuration
- ✅ Scales to massive codebases (100K+ repos)
- ✅ Enables multi-repository context

### Chat Context: Three Sources
1. **Conversation History** — Previous messages
2. **Code Search** — Automatic retrieval via Sourcegraph
   - **Keyword Search**: Query understanding (LLM) → keywords → BM25 ranking
   - **Embeddings** (optional): Local `st-multi-qa-mpnet-base-dot-v1` stored on-device
3. **User Control** — `@-mentions` for files, symbols, external sources (Slack, Notion, Linear, docs via OpenCtx)

### Autocomplete Context: Local-First, No Embeddings
```
Cursor Position + Code Graph → Heuristics → Recent Files/Open Tabs 
    → Jaccard Similarity Comparison → Ranked Snippets 
    → Reciprocal Rank Fusion → Final Context
```
- **No embeddings** — too slow for autocomplete latency budget
- **Jaccard Similarity**: Fast set-based comparison (word sets from code)
- **Code Graph**: Relationships between classes, methods, entities
- **Reciprocal Rank Fusion**: Combines multiple ranked snippet lists

### @-Mention System
- `@file` — Specific file content
- `@symbol` — Symbol definition
- `@repo` — Repository scope
- `@commit` — Git commit
- External: `@slack`, `@linear`, `@notion`, `@docs` (via OpenCtx)

### Multi-File Editing
- Automatic context: surrounding code, diagnostics, user-specified @-mentions
- Greater emphasis on user prompt quality
- Future: Incorporate code graph context

---

## 4. GitHub Copilot — Integrated VS Code/Visual Studio/IDE Plugin

### Architecture
- **Plugin-based** across VS Code, Visual Studio, JetBrains, Neovim
- **Cloud-first** with GitHub-hosted models
- **Copilot Edits** (2025): Multi-file iteration with inline diff review

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Inline Completions** | Ghost text autocomplete as you type |
| **Inline Chat** | Cmd+I — chat directly in editor at cursor |
| **Chat Sidebar** | Conversational coding assistant |
| **Copilot Edits** | Multi-file changes with preview/accept/reject per file |
| **Copilot Workspace** | Task-oriented development (preview) |

### Copilot Edits (Visual Studio 2022 17.13+)
**Workflow:**
1. Start Edits thread in Copilot Chat (pencil icon)
2. Describe changes in natural language
3. Specify context: `#errors`, `#file`, `#solution` or let Copilot discover
4. **Preview with clarity** — Summary of affected files and changes
5. **Review with flow** — Inline diffs in editor; Tab to accept, Alt+Del to reject
6. **Iterate with confidence** — Checkpoints to revisit earlier iterations

### Context Commands
| Command | Purpose |
|---------|---------|
| `#errors` | Focus on error-related files |
| `#file` | Specify particular file |
| `#solution` | Scope to entire solution |
| `@workspace` | Reference workspace symbols |

### Context Retrieval
- **Current file + open files** — Primary context
- **Repository indexing** — Semantic search for relevant code
- **User-specified** — Explicit file/symbol references
- **No local embeddings** — Cloud-based retrieval

---

## 5. Zed AI — Native Rust Editor with Transparent AI

### Architecture Philosophy
- **Native performance** — Rust-based, no Electron, real-time multiplayer
- **Explicit context control** — User selects what AI sees (no auto-indexing by default)
- **Full transparency** — Entire LLM request exposed as editable text
- **Extensibility** — Slash commands via WASM/JSON protocol

### Core Features

| Feature | Shortcut | Description |
|---------|----------|-------------|
| **Assistant Panel** | Ctrl+N | Structured conversation with persistent threads |
| **Inline Transformations** | Ctrl+Enter | Precision edits with streaming diff protocol |
| **Slash Commands** | / | Structured context injection |
| **Agent Panel** | Ctrl+N | Code generation, refactoring, debugging with tools |

### 8 Context Sources
| Source | Description |
|--------|-------------|
| **Assistant Panel** | Multi-turn conversations with persistent context threads |
| **Inline Transformations** | Context-aware edits triggered in-editor |
| **Slash Commands** | Structured context injection (`/file`, `/diagnostics`, etc.) |
| **Active Buffers** | Currently open files |
| **Project Structure** | Workspace file tree |
| **Custom Prompts Library** | Saved, reusable prompt templates |
| **Language Server Data** | Type info & diagnostics from LSPs |
| **MCP Servers** | External tool connections |

### Slash Commands (Precision Context Injection)
| Command | Function |
|---------|----------|
| `/file [path]` | Include specific file or tree of files |
| `/tab` | Include all open tabs |
| `/diagnostics` | Include LSP errors/warnings from codebase |
| `/search [query]` | Search project & include results |
| `/prompt [name]` | Load saved prompt template |
| `/fetch [url]` | Fetch & include URL content |
| `/terminal` | Include terminal output |
| `/workflow` | Complex multi-step transformations (upcoming) |

### Inline Transformations
- **Custom streaming diff protocol** + **CRDT-based buffers** = token-by-token streaming edits
- **Context inheritance** — Uses context built in assistant panel
- **Recursive transformations** — Apply inline transformations within assistant panel (prompt engineering workspace)
- **Multiple cursor support** — Apply same transformation across selections

### Explicit Context Philosophy
| Advantages | Tradeoffs |
|------------|-----------|
| Always know what AI is working with | More manual effort to set up context |
| No surprises from irrelevant code | Must know relevant files beforehand |
| Works well with smaller context windows | AI cannot discover related code autonomously |
| Reproducible context | No `@codebase`-style auto-discovery |

### Agent Panel
- **Tool calling** — Read, write, run code in project
- **Checkpoints** — Restore to pre-edit state after each tool call
- **Worktree isolation** — Git worktrees for parallel agent sessions
- **ACP integration** — External agents (Claude Code, Cursor) via Agent Client Protocol
- **Thread management** — Persistent, searchable, restorable conversations

### Model Providers
| Provider | Config |
|----------|--------|
| **Anthropic** | API key (Claude models) |
| **OpenAI** | API key (GPT models) |
| **Ollama** | Local endpoint (private models) |
| **Google** | API key (Gemini) |
| **OpenRouter** | Multi-provider routing |
| **Custom** | OpenAI-compatible endpoint |

---

## 6. Windsurf (Codeium) — VS Code Fork with "Flows" Paradigm

### Core Concept: Flows
AI maintains **deep, continuous awareness** of actions, codebase, and patterns over time.

### 7 Context Layers
| Layer | Description |
|-------|-------------|
| **Cascade Context Engine** | Tracks edits, terminal commands, navigation in real-time |
| **Rules Files** | Project & global instructions shaping AI behavior |
| **Memories** | Persistent facts carrying across sessions |
| **Workspace Index** | Semantic index of your codebase |
| **Conversation Context** | Current chat session in Cascade |
| **Active Editor State** | Current file, cursor position, selected text |
| **MCP Server Connections** | External tools & data sources |

### Rules Files: Persistent Instructions
**Global Rules** (Settings → AI → Rules) — Apply across all projects
**Project Rules** — `.windsurfrules` file or `.windsurf/rules/` directory
```markdown
# Project: E-Commerce Platform
## Stack
- Next.js 15, TypeScript 5.6, PostgreSQL/Prisma, Tailwind 4
## Conventions
- Server Components by default
- Zod for validation
- Prisma transactions for writes
## Testing
- Unit tests for components
- Integration tests for API routes
```

### Memories: Persistent Knowledge
- **Auto-created** when AI identifies important info
- **Manually added** for decisions to remember
- Loaded automatically in future sessions
- **Rules vs Memories**: Rules = conventions/constraints; Memories = facts/decisions

### Cascade: Agentic AI Assistant
| Mode | Description | Context Usage |
|------|-------------|---------------|
| **Chat Mode** | Standard Q&A | Active file, conversation history, referenced files |
| **Agent Mode** | Autonomous multi-step | Full: Rules, Memories, workspace index, terminal, file ops |

**Agent Mode capabilities:** Reads/writes files, runs terminal commands, navigates codebase, creates multi-file changes

### MCP Server Support
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-postgres"],
      "env": { "DATABASE_URL": "postgresql://dev@localhost:5432/mydb" }
    }
  }
}
```

### Scaling Limitations
- **Local indexing cap**: ~10,000 files (RAM limited)
- **Typical React app with node_modules**: 50,000+ files → exceeds limit
- **Remote indexing**: Available via Windsurf servers but manual trigger, not real-time
- **Real-time updates**: ~100ms for Augment Code vs. manual re-indexing for Windsurf

---

## Comparative Architecture Patterns

### 1. Editor Integration Strategy

| Tool | Approach | Implications |
|------|----------|--------------|
| **Cursor** | VS Code **fork** | Deep integration, custom UI, shadow workspace, but maintains fork |
| **Windsurf** | VS Code **fork** | Similar to Cursor, Open VSX registry only |
| **Continue.dev** | **Plugin** (VS Code + JetBrains) | Works in existing IDE, less invasive, JetBrains support |
| **Cody** | **Plugin** (VS Code, JetBrains, Eclipse, Neovim) | Broad IDE support, Sourcegraph backend |
| **GitHub Copilot** | **Plugin** (VS Code, VS, JetBrains, Neovim) | Widest IDE support, GitHub ecosystem |
| **Zed AI** | **Native editor** (Rust) | Maximum performance, no Electron, but separate editor |

### 2. Context Retrieval Architecture

| Tool | Primary Method | Multi-Repo | Local/Cloud | Privacy |
|------|---------------|------------|-------------|---------|
| **Cursor** | Vector embeddings (tree-sitter chunks) + RAG | Yes (via backend) | Cloud (Privacy Mode = local) | Configurable |
| **Continue.dev** | Configurable: embeddings, keyword, hybrid | Yes (via config) | **Fully local** (Ollama/vLLM) | **Best** — zero outbound |
| **Cody** | Sourcegraph search (BM25 + optional local embeddings) | **Native** (100K+ repos) | Hybrid (local embeddings optional) | **Strong** — no 3rd party code |
| **GitHub Copilot** | Cloud semantic search + open files | Limited | Cloud | GitHub-hosted |
| **Zed AI** | **Explicit** (slash commands, no auto-index) | Manual | Cloud (Anthropic/OpenAI/Ollama) | User-controlled |
| **Windsurf** | Cascade engine (real-time tracking) + workspace index | Remote indexing | Hybrid | Zero retention mode |

### 3. Inline Editing Patterns

| Tool | Shortcut | Diff Presentation | Accept/Reject |
|------|----------|-------------------|---------------|
| **Cursor** | Cmd+K | Inline diff in editor | Per-hunk, per-file |
| **Continue.dev** | Cmd+I | Inline diff in highlighted region | Cmd+Opt+Y/N, or all at once |
| **Cody** | Inline chat | Inline diff | Per-hunk |
| **GitHub Copilot** | Cmd+I (inline chat) | Inline diff in editor | Tab / Alt+Del |
| **Zed** | Ctrl+Enter | Streaming diff (CRDT) | Real-time, editable |
| **Windsurf** | Cascade Agent | Multi-file staged diff | Per-file in Agent Mode |

### 4. Multi-File Change Orchestration

| Tool | Approach | Approval Model | Checkpoints |
|------|----------|----------------|-------------|
| **Cursor** | **Composer** — staged diffs, Parallel Agents | Preview-then-approve (per-file) | Yes, per-edit |
| **Continue.dev** | Edit feature + Chat | Per-hunk accept/reject | Limited |
| **Cody** | Code editing with @-mentions | User-driven | Basic |
| **GitHub Copilot** | **Copilot Edits** — conversational + inline review | Preview-then-apply | Yes, iteration checkpoints |
| **Zed** | Agent Panel with tool calls | Per-tool-call restore | **Yes, every edit** |
| **Windsurf** | **Cascade Agent Mode** — autonomous | Chat vs Agent modes | Session-based |

### 5. @-Mention / Context Injection Systems

| Tool | Syntax | Sources |
|------|--------|---------|
| **Cursor** | `@file`, `@codebase`, `@web`, `@docs`, `@terminal`, `@git` | Files, semantic search, web, docs, terminal, git |
| **Continue.dev** | `/command` (slash) + context providers | Code, docs, diff, terminal, open, problems, custom |
| **Cody** | `@file`, `@symbol`, `@repo`, `@commit`, `@slack`, `@linear`, `@notion` | Files, symbols, repos, commits, external via OpenCtx |
| **GitHub Copilot** | `#file`, `#solution`, `#errors`, `@workspace` | Files, solution, errors, workspace symbols |
| **Zed** | `/file`, `/tab`, `/diagnostics`, `/search`, `/fetch`, `/prompt` | Files, tabs, diagnostics, search, URLs, saved prompts |
| **Windsurf** | Rules, Memories, @-mentions in Cascade | Rules files, persistent memories, workspace index |

---

## Key Architectural Tradeoffs

### Automation vs. Control Spectrum

```
HIGH AUTOMATION ←────────────────────────────────────────→ HIGH CONTROL
        │                                                    │
   Windsurf Agent                                    Zed (explicit)
   Cursor Composer                                    Continue (config)
   Copilot Edits                                       Cody (Sourcegraph)
        │                                                    │
        └────────────────── MIDDLE ─────────────────────────┘
```

### Local vs. Cloud Processing

| Aspect | Local-First | Cloud-First |
|--------|-------------|-------------|
| **Tools** | Continue.dev (Ollama), Zed (Ollama), Cody (local embeddings) | Cursor, Copilot, Windsurf (default) |
| **Privacy** | Code never leaves machine | Code sent to provider |
| **Latency** | Autocomplete: local = faster | Indexing: cloud = more compute |
| **Scale** | Limited by local RAM | Scales to massive repos |
| **Cost** | Hardware + electricity | Per-seat/token pricing |

### Implicit vs. Explicit Context

| Philosophy | Tools | Pros | Cons |
|------------|-------|------|------|
| **Implicit** (auto-discovery) | Cursor, Copilot, Windsurf | Less friction, "just works" | Surprises, token waste, privacy concerns |
| **Explicit** (user-controlled) | Zed, Continue (config), Cody (@-mentions) | Transparency, reproducibility, control | More setup effort, requires codebase knowledge |

---

## Emerging Patterns (2025-2026)

### 1. Shadow Workspaces / Virtual Environments
- **Cursor**: Hidden Electron window → kernel-level FUSE proxy (Linux)
- **Purpose**: AI tests edits with real LSP feedback without affecting user
- **Future**: Universal across tools

### 2. Agent Orchestration & Parallelism
- **Cursor 3**: Parallel Agents Panel (Research, Build, Test, Review agents)
- **Zed**: Worktree isolation for parallel agent threads
- **Windsurf**: Cascade Agent Mode with 20 tool calls/prompt
- **Pattern**: Multiple specialized agents > single general agent

### 3. Explicit Approval Gates
- **Cursor Composer**: Preview-then-approve default
- **Copilot Edits**: Inline review with Tab/Alt+Del
- **Zed**: Checkpoint per tool call
- **Shift**: From "edit then review" → "preview then approve"

### 4. Model Routing by Task
| Task | Model Tier |
|------|------------|
| Autocomplete (hot path) | 7B-32B local (Qwen, CodeLlama) |
| Inline edit (Cmd+K) | Mid-size (7B-70B) |
| Chat / Reasoning | Frontier (Claude 3.5, GPT-4, Gemini) |
| Embeddings | Specialized (nomic-embed, bge) |
| Reranking | Lightweight cross-encoder |

### 5. MCP (Model Context Protocol) Integration
- **Standardized** external tool access (databases, GitHub, browsers, APIs)
- **Supported by**: Continue.dev, Zed, Windsurf, Cursor (per-agent)
- **Enables**: Agent workflows spanning code + external systems

### 6. Rules / Memories / Persistent Context
- **Windsurf**: Rules files (project/global) + Memories (cross-session facts)
- **Cursor**: `.cursorrules` + project docs
- **Zed**: Custom prompts library + slash commands
- **Continue**: Rules in config.yaml + custom slash commands
- **Pattern**: Persistent, version-controlled context > ephemeral chat history

### 7. Design-to-Code Workflows
- **Cursor**: Design-driven Composer (Figma/image → component scaffolding)
- **Zed**: `/fetch` + recursive inline transformations
- **Quality**: ~70-85% scaffolding, last 30% needs human polish

---

## Recommendations for AI-First Desktop App Architecture

### If Building a New AI-First Editor:

1. **Choose fork vs. plugin** based on:
   - **Fork** if: Need deep UI integration, custom diff engines, shadow workspaces
   - **Plugin** if: Want broad IDE compatibility, lower maintenance, faster iteration

2. **Context system**: Hybrid approach
   - **Explicit primary** (slash commands, @-mentions) for transparency
   - **Implicit secondary** (auto-suggestions, recent files) for convenience
   - **Configurable indexing**: Local embeddings + keyword search, no mandatory cloud

3. **Model routing**: Explicit role-based config (like Continue.dev)
   - Autocomplete → tiny local model
   - Edit → mid-size local/cloud
   - Chat/Reasoning → frontier model
   - Embeddings → specialized local model

4. **Multi-file changes**: Staged diffs with per-file approval + checkpoints
   - Never auto-apply without review
   - Git worktree isolation for experimental agents

5. **Extensibility**: MCP + custom context providers + slash commands
   - WASM/JSON protocol for custom context sources
   - Version-controlled prompt/templates

6. **Privacy modes**: 
   - **Strict**: Zero outbound, fully local (Ollama/vLLM)
   - **Balanced**: Local embeddings, cloud reasoning
   - **Cloud**: Full cloud (team/default)

---

## Source References

1. **Cursor**: [How Cursor Works Internally](https://adityarohilla.com/2025/05/08/how-cursor-works-internally/), [Shadow Workspaces](https://cursor.com/blog/shadow-workspace), [Cursor 3 Deep Dive](https://www.digitalapplied.com/blog/cursor-3-deep-dive-agents-composer-review-2026)
2. **Continue.dev**: [Documentation](https://docs.continue.dev/), [Deep Dive 2026](https://www.digitalapplied.com/blog/continue-dev-deep-dive-open-source-ai-coding-assistant-2026)
3. **Cody**: [How Cody Understands Your Codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase), [Anatomy of a Coding Assistant](https://sourcegraph.com/blog/anatomy-of-a-coding-assistant)
4. **GitHub Copilot**: [Copilot Edits Preview](https://devblogs.microsoft.com/visualstudio/iterate-across-multiple-files-more-efficiently-with-github-copilot-edits-preview/)
5. **Zed AI**: [Introducing Zed AI](https://zed.dev/blog/zed-ai), [Agent Panel](https://zed.dev/docs/ai/agent-panel), [Context Management](https://datalakehousehub.com/blog/2026-03-context-management-zed)
6. **Windsurf**: [Context Management](https://datalakehousehub.com/blog/2026-03-context-management-windsurf), [vs Augment Code](https://www.augmentcode.com/tools/augment-code-vs-windsurf-which-ai-scales-with-your-codebase)

---

*Research compiled for AI Workplace Desktop App project. Architecture patterns documented for reference in building next-generation AI-first development environment.*