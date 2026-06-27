# AI Workplace Desktop App

Cross-platform desktop application for AI Workplace, targeting Linux, iOS, and Android.

## Architecture Decisions

### Framework Choice: Tauri v2

We chose **Tauri v2** as the primary framework for the following reasons:

1. **Smaller Bundle Size**: ~3-5MB vs ~50MB+ for Electron/Flutter
2. **Native Performance**: Uses system WebView (WebKit on Linux/macOS, WebView2 on Windows, WebKit on iOS)
3. **Security**: Rust backend with secure IPC, capability-based permissions
4. **Multi-platform**: Supports Linux, macOS, Windows, iOS, Android from single codebase
5. **Shared Business Logic**: Rust core can be shared with backend services
6. **Web Tech Frontend**: Leverage existing React/Vue/Svelte skills and components

### Project Structure Rationale

```
/home/bclerjuste/ai-workplace/desktop-app/
├── src-tauri/          # Tauri v2 Rust backend + configuration
├── lib/                # Flutter alternative (kept for evaluation)
├── android/            # Android-specific configuration
├── ios/                # iOS-specific configuration
├── shared/             # Shared business logic (TypeScript/Rust)
├── assets/             # Static assets (images, fonts, icons)
├── build-scripts/      # Platform-specific build automation
└── docs/               # Architecture docs, ADRs
```

### Integration Strategy with Existing Codebase

**Current Architecture:**
- Web UI: `/home/bclerjuste/ai-workplace/public/` (static frontend)
- Backend: `/home/bclerjuste/ai-workplace/backend/` (Python FastAPI)

**Desktop App Approach:**
1. **Phase 1**: Wrap existing web UI in Tauri WebView, communicate with local Python backend via sidecar
2. **Phase 2**: Migrate business logic to shared Rust crate, remove Python dependency
3. **Phase 3**: Native mobile implementations (iOS/Android) using same Rust core

### Shared Business Logic

The `shared/` directory contains:
- TypeScript types for frontend-backend contracts
- Rust core library (to be created) for business logic
- Utility functions used across platforms

### Build Targets

| Platform | Output | Build Script |
|----------|--------|--------------|
| Linux | AppImage, .deb, .rpm | `build-scripts/linux/build.sh` |
| macOS | .app, .dmg | `build-scripts/macos/build.sh` |
| Windows | .msi, .exe | `build-scripts/windows/build.ps1` |
| iOS | .ipa | `build-scripts/ios/build.sh` |
| Android | .apk, .aab | `build-scripts/android/build.sh` |

## Getting Started

```bash
# Install dependencies
npm install

# Development
npm run tauri dev

# Build for current platform
npm run tauri build

# Build all platforms (requires respective toolchains)
./build-scripts/linux/build.sh
./build-scripts/ios/build.sh
./build-scripts/android/build.sh
```

## Prerequisites

- Node.js 18+
- Rust 1.70+
- Tauri CLI v2 (`cargo install tauri-cli`)
- Platform-specific toolchains (see docs/PLATFORM_SETUP.md)

## License

MIT