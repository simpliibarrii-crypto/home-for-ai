---
language:
- en
license: mit
title: Home for AI
tags:
- home-for-ai
- desktop-orchestration
- ai-agents
- local-first
library_name: custom
short_description: Local-first desktop MVP for coordinating AI agents and a FastAPI backend.
---

# Home for AI

Home for AI is a local-first desktop MVP for coordinating AI agents, market-data experiments, and a Python FastAPI backend from a Tauri + React shell.

The project is early-stage. It is useful as a foundation for agent orchestration, desktop-side controls, backend experimentation, and public product iteration. It is not a certified financial product, broker, investment adviser, or production trading system.

## Current Focus

- Desktop shell built with Tauri, Rust, React, TypeScript, and Vite
- Python FastAPI backend with agent, chat, market, portfolio, settings, and websocket routes
- Local SQLite development path with PostgreSQL-compatible production configuration
- Safer CI for backend, frontend, Rust, and secret scanning
- Public-facing documentation that avoids private regulatory drafts and unsupported enterprise claims

## Repository Layout

| Path | Purpose |
| --- | --- |
| `backend/` | FastAPI backend, agents, market data, auth, database, and tests |
| `src/` | React/Vite frontend |
| `src-tauri/` | Tauri desktop wrapper and Rust commands |
| `.github/workflows/` | CI checks for backend, frontend, Rust, and secrets |
| `docs/` | Public documentation only |

## Backend Quickstart

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=sqlite+aiosqlite:///./home_for_ai.db python main.py
```

Open `http://localhost:8000/health` or `http://localhost:8000/docs` in development.

## Frontend Quickstart

```bash
npm install
npm run dev
```

## Desktop Quickstart

```bash
npm install
npm run tauri:dev
```

## Environment

Useful development defaults:

```bash
DATABASE_URL=sqlite+aiosqlite:///./home_for_ai.db
ENVIRONMENT=development
JWT_SECRET_KEY=change-me
OPENROUTER_API_KEY=optional-for-local-dev
```

Use a strong secret and a managed database connection outside local development.

## Safety Notes

- Do not use this software for live financial decisions without legal, security, compliance, and trading-risk review.
- Agent output should be treated as experimental workflow assistance, not financial advice.
- Keep private filings, investor plans, personal contact drafts, credentials, and commercial strategy documents out of the public repository.
- Public claims should match verified product status.

## Project Direction

Home for AI can become the desktop home base for a broader agent ecosystem: local controls, auditable backend calls, model routing, data connectors, and user-facing workflows. The next useful milestones are reliable tests, a clean packaged desktop build, a real onboarding flow, and a narrow demo that works end to end without private credentials.

## License

MIT
