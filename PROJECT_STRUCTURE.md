# Desktop App Project Structure

## Directory Structure

```
/home/bclerjuste/ai-workplace/desktop-app/
├── .gitignore
├── README.md
├── PROJECT_STRUCTURE.md          # This file
├── package.json                  # Tauri v2 frontend package.json
├── Cargo.toml                    # Tauri v2 workspace Cargo.toml
├── tauri.conf.json               # Tauri v2 configuration
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config for frontend
├── index.html                    # HTML entry point
├── src/                          # Frontend source (React/Svelte/Vue)
│   ├── main.ts                   # Entry point
│   ├── App.tsx                   # Root component
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components
│   ├── hooks/                    # Custom hooks
│   ├── stores/                   # State management
│   ├── services/                 # API services
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utilities
│   └── styles/                   # Global styles
├── src-tauri/                    # Tauri v2 Rust backend
│   ├── Cargo.toml                # Tauri app Cargo.toml
│   ├── tauri.conf.json           # Tauri configuration
│   ├── build.rs                  # Build script
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Library root
│   │   ├── commands/             # Tauri commands
│   │   ├── services/             # Rust services
│   │   ├── models/               # Rust models
│   │   ├── utils/                # Rust utilities
│   │   └── python_sidecar/       # Python sidecar integration
│   ├── icons/                    # App icons
│   │   ├── icon.png              # 1024x1024 source
│   │   ├── icon.icns             # macOS icon
│   │   ├── icon.ico              # Windows icon
│   │   └── *.png                 # Linux icons (16-512px)
│   ├── gen/                      # Generated files (tauri.conf.json, etc.)
│   └── target/                   # Build output (gitignored)
├── lib/                          # Flutter alternative (evaluation)
│   ├── pubspec.yaml              # Flutter dependencies
│   ├── analysis_options.yaml     # Lint rules
│   ├── src/
│   │   ├── main.dart             # Flutter entry point
│   │   ├── app.dart              # App widget
│   │   ├── core/                 # Core utilities
│   │   ├── features/             # Feature modules
│   │   └── shared/               # Shared widgets
│   ├── assets/                   # Flutter assets
│   ├── fonts/                    # Flutter fonts
│   └── test/                     # Flutter tests
├── android/                      # Android configuration
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── AndroidManifest.xml
│   │   │       ├── java/         # Kotlin/Java code
│   │   │       ├── res/          # Resources
│   │   │       └── assets/       # Assets
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   └── gradle/                   # Gradle wrapper
├── ios/                          # iOS configuration
│   ├── Runner.xcodeproj/
│   ├── Runner/
│   │   ├── Info.plist
│   │   ├── AppDelegate.swift
│   │   ├── Runner-Bridging-Header.h
│   │   └── Assets.xcassets/
│   ├── Podfile
│   ├── Podfile.lock
│   └── Runner.xcworkspace/
├── shared/                       # Shared business logic
│   ├── src/
│   │   ├── types/                # Shared TypeScript types
│   │   ├── rust/                 # Shared Rust crate (to be created)
│   │   │   ├── Cargo.toml
        │   │   ├── Cargo.lock
        │   │   ├── src/
        │   │   │   ├── lib.rs
        │   │   │   ├── models/
        │   │   │   ├── services/
        │   │   │   └── utils/
        │   │   └── Cargo.lock
        │   └── utils/              # Shared utilities
        ├── types/                  # Shared TypeScript types (duplicate for clarity)
        │   ├── api.ts              # API types
        │   ├── models.ts           # Domain models
        │   └── events.ts           # Event types
        └── utils/                  # Shared utilities
            ├── api.ts              # API client
            ├── storage.ts          # Storage utilities
            └── validation.ts       # Validation utilities
├── assets/                       # Static assets
│   ├── images/
│   │   ├── logo.png
│   │   ├── splash.png
│   │   └── icons/
│   ├── fonts/
│   │   ├── Inter/
│   │   └── JetBrainsMono/
│   └── icons/
│       ├── app-icon.svg
│       └── tray-icon.svg
├── build-scripts/                # Build automation
│   ├── linux/
│   │   ├── build.sh              # Linux build script
│   │   ├── build-appimage.sh     # AppImage builder
│   │   ├── build-deb.sh          # .deb builder
│   │   ├── build-rpm.sh          # .rpm builder
│   │   └── Dockerfile            # Docker build environment
│   ├── ios/
│   │   ├── build.sh              # iOS build script
│   │   ├── build-ipa.sh          # IPA builder
│   │   ├── Fastfile              # Fastlane config
│   │   └── Matchfile             # Match config
│   ├── android/
│   │   ├── build.sh              # Android build script
│   │   ├── build-apk.sh          # APK builder
│   │   ├── build-aab.sh          # AAB builder
│   │   └── gradle.properties
│   ├── windows/
│   │   ├── build.ps1             # Windows build script
│   │   ├── build-msi.ps1         # MSI builder
│   │   └── build-exe.ps1         # EXE builder
│   └── common/
│       ├── version.sh            # Version management
│       ├── sign.sh               # Code signing
│       └── notarize.sh           # macOS notarization
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # Architecture decision records
│   ├── PLATFORM_SETUP.md         # Platform setup guides
│   ├── BUILD_GUIDE.md            # Build instructions
│   ├── DEPLOYMENT.md             # Deployment guide
│   └── ADR/                      # Architecture Decision Records
│       ├── 001-tauri-v2.md
│       ├── 002-shared-rust-core.md
│       └── 003-mobile-strategy.md
└── src-tauri/target/             # Build output (gitignored)
    ├── debug/
    ├── release/
    ├── aarch64-apple-ios/
    ├── aarch64-linux-android/
    ├── x86_64-apple-ios/
    └── x86_64-pc-windows-msvc/
```

## Key Files Description

### Root Configuration
| File | Purpose |
|------|---------|
| `package.json` | Frontend dependencies, Tauri CLI, dev scripts |
| `Cargo.toml` | Rust workspace configuration |
| `tauri.conf.json` | Tauri v2 configuration |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript configuration |

### Tauri Configuration (src-tauri/)
| File | Purpose |
|------|---------|
| `tauri.conf.json` | App metadata, window config, permissions, bundle config |
| `Cargo.toml` | Rust dependencies, Tauri dependencies, features |
| `build.rs` | Build script for code generation |
| `src/main.rs` | Application entry point |
| `src/lib.rs` | Library root, command registration |
| `src/commands/` | Tauri command handlers |
| `src/services/` | Business logic services |
| `src/models/` | Rust data models |
| `src/utils/` | Utility functions |
| `icons/` | Platform-specific icons |

### Build Scripts
| Script | Platform | Output |
|--------|----------|--------|
| `build-scripts/linux/build.sh` | Linux | AppImage, .deb, .rpm |
| `build-scripts/linux/build-appimage.sh` | Linux | AppImage |
| `build-scripts/ios/build.sh` | macOS/iOS | .app, .ipa |
| `build-scripts/android/build.sh` | Linux/macOS/Windows | .apk, .aab |
| `build-scripts/windows/build.ps1` | Windows | .msi, .exe |
| `build-scripts/common/version.sh` | All | Version management |

### Shared Module Structure
```
shared/
├── src/
│   ├── types/              # TypeScript types (shared with frontend)
│   │   ├── api.ts         # API request/response types
│   │   ├── models.ts      # Domain models
│   │   ├── events.ts      # Event types
│   │   └── index.ts       # Re-exports
│   ├── rust/              # Shared Rust crate (future)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── models/
│   │       ├── services/
│   │       └── utils/
│   └── utils/
│       ├── api.ts         # API client
│       ├── storage.ts     # Local storage
│       └── validation.ts  # Validation schemas
```

### Platform-Specific Directories

#### Android (android/)
- Standard Android Gradle project structure
- Kotlin-based MainActivity
- Tauri Android integration
- Gradle build configuration

#### iOS (ios/)
- Xcode project structure
- Swift-based AppDelegate
- Tauri iOS integration
- CocoaPods dependencies

## Build Outputs

### Linux (build-scripts/linux/build.sh)
```
dist/
├── ai-workplace_1.0.0_amd64.AppImage
├── ai-workplace_1.0.0_amd64.deb
├── ai-workplace_1.0.0_amd64.rpm
└── ai-workplace_1.0.0_amd64.tar.gz
```

### macOS (build-scripts/macos/build.sh)
```
dist/
├── AI Workplace.app
├── AI Workplace_1.0.0_aarch64.dmg
└── AI Workplace_1.0.0_x64.dmg
```

### Windows (build-scripts/windows/build.ps1)
```
dist/
├── AI Workplace_1.0.0_x64_en-US.msi
├── AI Workplace_1.0.0_x64_setup.exe
└── AI Workplace_1.0.0_x64_portable.exe
```

### iOS (build-scripts/ios/build.sh)
```
dist/
└── AI Workplace.ipa
```

### Android (build-scripts/android/build.sh)
```
dist/
├── ai-workplace-1.0.0-universal.apk
├── ai-workplace-1.0.0-arm64-v8a.apk
├── ai-workplace-1.0.0-armeabi-v7a.apk
└── ai-workplace-1.0.0.aab
```

## Integration with Existing Codebase

```
/home/bclerjuste/ai-workplace/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   ├── requirements.txt
│   └── pyproject.toml
├── public/                     # Web frontend (static)
│   ├── index.html
│   ├── assets/
│   └── ...
└── desktop-app/                # This project
    ├── src-tauri/
    │   └── src/
    │       └── python_sidecar/    # Python sidecar integration
    └── shared/
        └── src/
            └── rust/              # Shared Rust core (future)
```

### Phase 1 Integration (Current)
- WebView loads `http://localhost:8080` (served by Python backend)
- Tauri sidecar runs Python backend as child process
- Tauri commands proxy to Python backend via HTTP

### Phase 2 Integration (Planned)
- Move business logic to `shared/src/rust/`
- Compile Rust core to cdylib for Python (via PyO3)
- Compile Rust core to static lib for Tauri
- Remove Python dependency from desktop app

## Gitignore Rules

Key patterns in `.gitignore`:
- `node_modules/`, `target/`, `Cargo.lock` - Dependencies
- `dist/`, `build/`, `*.AppImage`, `*.app`, `*.apk`, `*.ipa` - Build outputs
- `android/.gradle/`, `android/local.properties` - Android build
- `ios/Pods/`, `ios/*.xcworkspace`, `ios/build/` - iOS build
- `.env`, `.env.local` - Environment files
- IDE folders: `.idea/`, `.vscode/`, `.DS_Store`

## CI/CD Integration

The structure supports CI/CD with:
- GitHub Actions workflows in `.github/workflows/`
- Platform-specific build jobs
- Artifact upload for releases
- Code signing integration
- Automated testing per platform