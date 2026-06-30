# Agents Context

## Stack Overview

Home for AI is a **Tauri v2** desktop application with three language layers:

| Layer | Language/Framework | Location |
|-------|-------------------|----------|
| Desktop Shell | React + TypeScript + Tailwind CSS | `src/` |
| Native Core | Rust (Tauri v2) | `src-tauri/` |
| Backend API | Python FastAPI | `backend/` |

## Key Commands

```bash
# Frontend / Tauri
npm run dev           # Vite dev server
npm run tauri:dev     # Tauri desktop (full app)
npm run build         # TypeScript + Vite build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Vitest

# Rust
cargo check           # Check compilation
cargo clippy          # Lint
cargo build           # Build

# Python backend
cd backend && uvicorn main:app --reload
cd backend && pytest
```

## Project Structure

```
├── src/                  # React frontend (TypeScript)
├── src-tauri/            # Tauri Rust backend
├── backend/              # Python FastAPI backend
│   ├── agents/           # AI trading agents
│   ├── api/              # REST endpoints
│   ├── models/           # LLM routing & data models
│   ├── security/         # Encryption, auth
│   └── tests/            # Python tests
├── shared/               # Shared business logic (Rust)
├── architecture/         # Architecture docs
└── docs/                 # Documentation
```

## Conventions

- **Python**: FastAPI with async routes, Pydantic v2 validation, pytest
- **TypeScript**: React functional components, Zustand for state, routes in `src/pages/`
- **Rust**: Tauri commands, `thiserror` for errors, async with tokio
- **Testing**: Vitest for frontend, pytest for backend, `cargo test` for Rust
- **Formatting**: Prettier (TS), ruff (Python), rustfmt (Rust)

## LLM Integration

The app uses a fusion LLM router (`backend/models/fusion_llm.py`) that calls Kimi 2.6 and DeepSeek V3 via OpenRouter API. Agent trading decisions and skill learning use this stack.
