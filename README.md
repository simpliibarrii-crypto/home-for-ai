# Home for AI

[![License](https://img.shields.io/github/license/simpliibarrii-crypto/home-for-ai?style=for-the-badge)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/simpliibarrii-crypto/home-for-ai/ci-python.yml?branch=master&style=for-the-badge&label=CI)](https://github.com/simpliibarrii-crypto/home-for-ai/actions)
[![Raven Ecosystem](https://img.shields.io/badge/Raven-Orchestration_Platform-30363D?style=for-the-badge&labelColor=05060A)](https://github.com/simpliibarrii-crypto/raven-ai)

**Home for AI is the local orchestration platform for the Raven ecosystem.**

It provides a desktop-first environment for hosting local AI workflows, coordinating agents, and bridging personal/local compute with cloud services when needed.

## Role in the Raven ecosystem

- **Raven AI**: flagship biology and healthcare agent platform.
- **OpenClinical AI**: healthcare deployment layer.
- **Home for AI**: local orchestration and runtime shell.

## Stack

- Tauri
- React / TypeScript
- Rust backend bridge
- Cross-platform build targets

## Quick start

```bash
npm install
npm run build
```

For Tauri development:

```bash
npm run tauri:dev
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
