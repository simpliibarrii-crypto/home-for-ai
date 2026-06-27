# Cross-Platform Framework Decision Matrix
## Sonia AI Workplace — Linux Desktop + iOS + Android from Single Codebase

**Date:** June 26, 2026  
**Current Stack:** Python backend (app.py, ai-backend.py) + Vanilla JS frontend (vanilla JS + Three.js 3D brain, vanilla CSS)  
**Current Desktop:** Native `.desktop` launcher → Python HTTP server + WebView  
**Target Platforms:** Linux Desktop (primary) + iOS + Android  
**Key Requirements:** WebView/WebGL for 3D brain (Three.js), local file system access (wiki, vault), background services (sister autonomy), push notifications, App Store / Play Store distribution

---

## Executive Summary

| Framework | **Verdict** | Best For | Primary Concern |
|-----------|------------|----------|-----------------|
| **Tauri v2** | ✅ **RECOMMENDED** | Wrapping existing web UI, smallest bundle, Rust backend, native mobile | Rust learning curve, WebView quirks on mobile |
| **Flutter** | ⚠️ Strong contender | Full rewrite with native performance, single UI codebase | WebGL/Three.js in WebView is problematic, Dart learning curve |
| **Kotlin Multiplatform (Compose Multiplatform)** | ⚠️ Strong for Kotlin shops | Kotlin-first teams, maximum code sharing | iOS stable only since 2025, Compose iOS still maturing, no web target |
| **React Native** | ❌ Not recommended | React teams, existing RN codebase | Linux desktop is community-maintained, no WebView/WebGL story |
| **Electron + Capacitor** | ❌ Not recommended | Existing Electron apps migrating to mobile | Bundle size (~150MB+), memory, Capacitor desktop is community-maintained |

---

## Detailed Comparison Matrix

### 1. Tauri v2 (Rust + WebView) — **✅ RECOMMENDED**

| Criteria | Rating | Details |
|----------|--------|---------|
| **Platform Support** | ✅ Excellent | Linux (Wayland/X11), macOS, Windows, **iOS (stable v2.0+)**, **Android (stable v2.0+)** |
| **Bundle Size** | ✅ **Best-in-class** | ~3-10 MB (vs 100-150 MB Electron) — uses system WebView (WebView2/WebKitGTK/Android WebView/iOS WKWebView) |
| **Memory/RAM** | ✅ Excellent | ~30-60 MB baseline vs 150-300 MB Electron |
| **Performance** | ✅ Excellent | Native Rust backend, minimal JS bridge overhead |
| **WebView/WebGL/Three.js** | ✅ Excellent | Uses system WebView (WebKitGTK/WebView2/WKWebView/Android WebView) — full WebGL/Three.js support |
| **Local File System Access** | ✅ Excellent | Rust `std::fs`, `tokio::fs`, Tauri `fs` plugin — full read/write/append/list/watch |
| **Background Services** | ✅ Excellent | Rust `tokio` tasks, system tray, background Tauri commands, `tauri-plugin-process` |
| **Push Notifications** | ✅ Good | `tauri-plugin-push` (FCM/APNs), local notifications via `tauri-plugin-notification` |
| **App Store / Play Store** | ✅ Production ready | Tauri v2.0+ stable iOS/Android, notarization, notarization, Play Console ready |
| **Licensing** | ✅ MIT/Apache-2.0 | Permissive, commercial-friendly |
| **Language/Runtime** | Rust + JS/TS | Rust for backend/commands, your existing JS/TS/Three.js runs unchanged in WebView |
| **Learning Curve** | ⚠️ Moderate | Rust learning curve if new; JS frontend stays same |
| **WebGL/Three.js Support** | ✅ Excellent | Full WebGL2 in WebView on all platforms (WebKitGTK, WebView2, WKWebView, Android WebView) |
| **Local File Access (wiki/vault)** | ✅ Native | `tauri-plugin-fs`, `tauri-plugin-opener`, `tauri-plugin-dialog` — full read/write |
| **Background Services (Sister Autonomy)** | ✅ Native Rust | Tokio tasks, `tauri-plugin-process`, system tray, background commands |
| **Push Notifications (Mobile)** | ✅ Via plugins | FCM (Android), APNs (iOS) via `tauri-plugin-push` |
| **App Store / Play Store Ready** | ✅ Yes (v2.0+) | Notarization, TestFlight, Play Console, signed AAB/IPA |
| **Current Code Reuse** | ✅ **High** | **Your existing vanilla JS + Three.js + CSS runs AS-IS in WebView** — minimal rewrite |

**Tauri v2 Mobile Status (2024-2025):**
- iOS: Stable since Tauri 2.0 (WKWebView, full App Store compliance)
- Android: Stable since Tauri 2.0 (Android WebView, Play Store ready)
- Plugins: `tauri-plugin-fs`, `tauri-plugin-notification`, `tauri-plugin-push`, `tauri-plugin-process`, `tauri-plugin-opener`, `tauri-plugin-dialog`, `tauri-plugin-shell`, `tauri-plugin-updater`

**Migration Path for Sonia:**
1. Keep Python backend (`app.py`, `ai-backend.py`) as separate local HTTP server (or rewrite in Rust)
2. Wrap existing `/public` (index.html, app.js, 3d-kb.js, Three.js) as Tauri frontend — **zero JS rewrite**
3. Expose Python API via Tauri commands (Rust → Python via `std::process::Command` or rewrite hot paths in Rust)
4. Use `tauri-plugin-fs` for `~/wiki`, `~/.agents`, `vault/` file access
5. Use `tauri-plugin-process` + system tray for sister autonomy background tasks
6. Build `.appimage`/`.deb` (Linux), `.app`/`.dmg` (macOS), `.exe`/`.msi` (Windows), `.ipa` (iOS), `.aab` (Android)

---

### 2. Flutter (Dart) — **⚠️ Strong Contender for Full Rewrite**

| Criteria | Rating | Details |
|----------|--------|---------|
| **Platform Support** | ✅ Excellent | Linux, macOS, Windows, iOS, Android, Web (stable) |
| **Bundle Size** | ⚠️ Medium | ~10-20 MB (AOT compiled), larger than Tauri but smaller than Electron |
| **Memory/RAM** | ✅ Good | ~50-80 MB baseline, Dart AOT compiled |
| **Performance** | ✅ Excellent | 60/120 FPS, Skia/Impeller rendering, no JS bridge |
| **WebView/WebGL/Three.js** | ❌ **Major Issue** | `webview_flutter` uses platform WebView — **Three.js works but performance is poor on mobile WebView**; no native Three.dart port that's production-ready for complex scenes |
| **Local File System Access** | ✅ Good | `path_provider`, `file_picker`, `drift`/`sqflite` for local DB |
| **Background Services** | ⚠️ Limited | `flutter_background_service`, `workmanager` — limited on iOS (no true background) |
| **Push Notifications** | ✅ Good | `firebase_messaging` (FCM/APNs), `flutter_local_notifications` |
| **App Store / Play Store** | ✅ Production ready | Mature tooling, Apple/Google review compliance |
| **Licensing** | ✅ BSD-3-Clause | Permissive |
| **Language/Runtime** | Dart (AOT/JIT) | New language to learn if not known |
| **Learning Curve** | ⚠️ High | New language (Dart), new UI paradigm (widgets), full UI rewrite |
| **Three.js / WebGL Support** | ❌ Poor | `flutter_three` exists but abandoned; `three.dart` unmaintained; WebView WebGL is slow/janky on mobile |
| **Current Code Reuse** | ❌ **None** | **Complete rewrite** — Dart widgets, no HTML/CSS/JS reuse |
| **Background Sister Autonomy** | ⚠️ Limited | Isolates + background service, but iOS restrictions severe |

**Verdict for Sonia:** Only viable if you **fully rewrite the UI in Flutter widgets** and port Three.js brain to Flutter (Flame/Flutter 3D or custom Impeller). Not viable if keeping Three.js WebView.

---

### 3. Kotlin Multiplatform (Compose Multiplatform) — **⚠️ Strong for Kotlin-First Teams**

| Criteria | Rating | Details |
|----------|--------|---------|
| **Platform Support** | ✅ Good | Android (native), iOS (stable since 2025), Desktop (JVM), Web (WASM/JS Beta) |
| **Bundle Size** | ✅ Good | ~9 MB overhead on iOS (per JetBrains), smaller than Electron |
| **Memory/RAM** | ✅ Good | Native compilation, Kotlin/Native on iOS |
| **Performance** | ✅ Excellent | Native UI on each platform, Compose runtime |
| **WebView/WebGL/Three.js** | ❌ **Not supported** | Compose is native UI — no WebView, no Three.js; would need Skia/Compose 3D |
| **Local File System Access** | ✅ Excellent | `okio`, `kotlinx.io`, platform APIs via `expect/actual` |
| **Background Services** | ✅ Good | Coroutines, `WorkManager` (Android), `BGAppRefreshTask` (iOS) |
| **Push Notifications** | ✅ Good | Firebase KMP SDK, APNs/FCM via platform channels |
| **App Store / Play Store** | ✅ Production ready | Compose iOS stable since 2025, mature Android |
| **Licensing** | ✅ Apache-2.0 | Permissive |
| **Language/Runtime** | Kotlin (JVM/Native/JS) | Requires Kotlin expertise |
| **Learning Curve** | ⚠️ High | New UI paradigm (Compose), KMP concepts, expect/actual |
| **Current Code Reuse** | ❌ **None** | **Complete UI rewrite** in Compose; Python backend stays separate |

**Verdict for Sonia:** Only if team knows Kotlin and willing to rewrite UI in Compose + port 3D brain to Compose/Skia. No WebView path.

---

### 4. React Native (Microsoft RN Windows/macOS + Expo) — **❌ Not Recommended for Linux Desktop**

| Criteria | Rating | Details |
|----------|--------|---------|
| **Platform Support** | ⚠️ Partial | iOS/Android ✅, Windows/macOS (Microsoft fork, maintained), **Linux (community, not official)** |
| **Bundle Size** | ⚠️ Medium | ~30-50 MB (Hermes + native) |
| **Memory/RAM** | ⚠️ Medium | ~80-120 MB |
| **Performance** | ✅ Good | Hermes JSI, Fabric, native modules |
| **WebView/WebGL/Three.js** | ❌ **Poor** | `react-native-webview` exists but **no WebGL/Three.js support** on mobile; `expo-three` abandoned |
| **Local File System Access** | ✅ Good | `react-native-fs`, `expo-file-system` |
| **Background Services** | ⚠️ Limited | `react-native-background-task`, iOS severe restrictions |
| **Push Notifications** | ✅ Good | `expo-notifications`, FCM/APNs |
| **App Store / Play Store** | ✅ Production ready | Expo EAS, mature |
| **Licensing** | ✅ MIT | Permissive |
| **Language/Runtime** | JS/TS + Native (Objective-C/Swift/Kotlin) | Bridge/JSI overhead |
| **Learning Curve** | ⚠️ Moderate | React + native modules |
| **Current Code Reuse** | ⚠️ Partial | React components reusable, but **Three.js brain won't work** — no WebGL in RN WebView |

**Verdict for Sonia:** Linux desktop support is community-maintained (`react-native-linux`), not production-grade. No WebGL in WebView. Not suitable.

---

### 5. Electron + Capacitor — **❌ Not Recommended**

| Criteria | Rating | Details |
|----------|--------|---------|
| **Platform Support** | ✅ All | Electron (Linux/macOS/Win), Capacitor (iOS/Android) |
| **Bundle Size** | ❌ **Worst** | ~150-200 MB (Electron) + Capacitor overhead |
| **Memory/RAM** | ❌ **Worst** | 200-400 MB baseline |
| **Performance** | ⚠️ Medium | Chromium + Node.js, heavy |
| **WebView/WebGL/Three.js** | ✅ Excellent | Full Chromium, perfect Three.js support |
| **Local File System Access** | ✅ Excellent | Node.js `fs`, `electron-store`, Capacitor `Filesystem` plugin |
| **Background Services** | ✅ Good | Electron `BrowserWindow` hidden, Node.js background, Capacitor background |
| **Push Notifications** | ✅ Good | Electron + Capacitor plugins |
| **App Store / Play Store** | ⚠️ Complex | Electron apps rejected from Mac App Store (private APIs); Capacitor iOS/Android OK but heavy |
| **Licensing** | ✅ MIT/Apache-2.0 | Permissive |
| **Language/Runtime** | Node.js + Chromium | Familiar if web background |
| **Learning Curve** | ✅ Low | Web tech stack |
| **Current Code Reuse** | ✅ High | **Your web UI runs as-is** in Electron |
| **Bundle/Store Issues** | ❌ Major | App Store rejects Electron (private APIs, non-native UI); Play Store OK but huge bundle |

**Verdict for Sonia:** Bundle size and memory unacceptable for mobile. Mac App Store rejection risk. Capacitor desktop is community-maintained (`capacitor-community/electron`). Tauri is strictly superior.

---

## Requirement Mapping for Sonia AI Workplace

| Requirement | Tauri v2 | Flutter | KMP/Compose | React Native | Electron+Capacitor |
|------------|:--------:|:-------:|:-----------:|:------------:|:------------------:|
| **Linux Desktop (primary)** | ✅ Native | ✅ Native | ✅ JVM Desktop | ⚠️ Community | ✅ Native |
| **iOS App Store** | ✅ v2.0+ | ✅ Stable | ✅ Stable (2025) | ✅ Expo/EAS | ✅ Capacitor |
| **Android Play Store** | ✅ v2.0+ | ✅ Stable | ✅ Native | ✅ Expo/EAS | ✅ Capacitor |
| **WebGL / Three.js 3D Brain** | ✅ **Full support** | ❌ Poor (WebView) | ❌ No WebView | ❌ No WebGL | ✅ Full Chromium |
| **Local FS: ~/wiki, ~/.agents, vault/** | ✅ `tauri-plugin-fs` | ✅ path_provider | ✅ kotlinx.io | ✅ expo-fs | ✅ Node fs + Capacitor |
| **Background: Sister Autonomy** | ✅ Rust tokio + tray | ⚠️ Limited (iOS) | ✅ Coroutines | ⚠️ Limited | ✅ Node.js bg |
| **Push Notifications (Mobile)** | ✅ FCM/APNs plugins | ✅ firebase_messaging | ✅ Firebase KMP | ✅ expo-notifications | ✅ Capacitor push |
| **Bundle Size (Mobile)** | ✅ **3-10 MB** | ⚠️ 10-20 MB | ✅ ~9 MB + app | ⚠️ 30-50 MB | ❌ 150+ MB |
| **RAM Usage (Mobile)** | ✅ **30-60 MB** | ✅ 50-80 MB | ✅ 50-80 MB | ⚠️ 80-120 MB | ❌ 200+ MB |
| **Current Code Reuse (JS/Three.js)** | ✅ **100% frontend reuse** | ❌ Rewrite | ❌ Rewrite | ❌ No WebGL | ✅ 100% reuse |
| **Python Backend Integration** | ✅ Rust→Python or rewrite | ✅ HTTP/FFI | ✅ HTTP/JNI | ✅ HTTP | ✅ Node child_process |
| **Licensing** | ✅ MIT/Apache-2.0 | ✅ BSD-3 | ✅ Apache-2.0 | ✅ MIT | ✅ MIT/Apache-2.0 |

---

## Recommendation: **Tauri v2 (Rust + WebView)**

### Why Tauri v2 Wins for Sonia

| Factor | Rationale |
|--------|-----------|
| **Zero Frontend Rewrite** | Your vanilla JS + Three.js + CSS runs **unchanged** in system WebView on all platforms |
| **Smallest Mobile Bundle** | 3-10 MB vs 50-200 MB competitors — critical for App Store/Play Store download conversion |
| **Lowest Memory** | 30-60 MB vs 150-400 MB — essential for mobile background sister autonomy |
| **Native File System** | `tauri-plugin-fs` gives full `~/wiki`, `~/.agents`, `vault/` read/write/watch |
| **Background Services** | Rust `tokio` tasks + system tray + `tauri-plugin-process` = true background sisters |
| **Push Notifications** | `tauri-plugin-push` (FCM/APNs) + `tauri-plugin-notification` (local) |
| **App Store Ready** | Tauri 2.0+ has notarization, TestFlight, Play Console workflows documented |
| **Licensing** | MIT/Apache-2.0 — no commercial restrictions |
| **Python Backend** | Keep `app.py`/`ai-backend.py` as local HTTP server; call from Tauri commands via `std::process::Command` or rewrite hot paths in Rust |
| **WebGL/Three.js** | Full WebGL2 in WebKitGTK (Linux), WebView2 (Windows), WKWebView (iOS), Android WebView |

### Migration Path (2-4 weeks estimated)

```
Week 1: Tauri v2 project init
  - `cargo install tauri-cli`
  - `tauri init` in /home/bclerjuste/ai-workplace/desktop-app/
  - Point frontend to /public (existing index.html, app.js, 3d-kb.js, Three.js)
  - Configure tauri.conf.json: window config, tray, plugins

Week 2: Native capabilities
  - Add tauri-plugin-fs, tauri-plugin-opener, tauri-plugin-dialog, tauri-plugin-shell
  - Expose Python API via Tauri commands (Rust → Python HTTP or std::process::Command)
  - Implement ~/wiki, ~/.agents, vault/ file watchers in Rust (notify crate)
  - System tray + background sister autonomy (tokio tasks)

Week 3: Mobile targets
  - `tauri android init` / `tauri ios init`
  - Configure WKWebView (iOS) / Android WebView for WebGL
  - tauri-plugin-push for FCM/APNs
  - Test 3D brain on iOS Safari / Chrome Android

Week 4: Store prep
  - iOS: Code signing, provisioning profiles, TestFlight
  - Android: Keystore, Play Console, AAB bundle
  - Linux: AppImage, .deb, Flatpak via tauri-action
  - Auto-updater via tauri-plugin-updater
```

### Tauri v2 Plugin Checklist for Sonia

| Plugin | Purpose | Status |
|--------|---------|--------|
| `tauri-plugin-fs` | Read/write `~/wiki`, `~/.agents`, `vault/` | ✅ Stable |
| `tauri-plugin-opener` | Open files/URLs in system apps | ✅ Stable |
| `tauri-plugin-dialog` | File pickers, save dialogs | ✅ Stable |
| `tauri-plugin-shell` | Spawn Python backend, run CLI tools | ✅ Stable |
| `tauri-plugin-process` | Background tasks, sidecar binaries | ✅ Stable |
| `tauri-plugin-notification` | Local notifications (desktop + mobile) | ✅ Stable |
| `tauri-plugin-push` | FCM/APNs push notifications | ✅ Stable |
| `tauri-plugin-updater` | Auto-updates (AppImage, MSIX, DMG, IPA, AAB) | ✅ Stable |
| `tauri-plugin-clipboard` | Clipboard access for sisters | ✅ Stable |
| `tauri-plugin-global-shortcut` | Global hotkeys (Cmd+K palette) | ✅ Stable |
| `tauri-plugin-positioner` | Window positioning (tray popup) | ✅ Stable |

---

## Alternative: If Team Strongly Prefers No Rust

| Option | Trade-off |
|--------|-----------|
| **Flutter** | Full rewrite; lose Three.js; learn Dart; but single codebase, great performance |
| **KMP + Compose** | Full rewrite; lose Three.js; learn Kotlin/Compose; best if team already Kotlin |
| **Electron (desktop only) + Capacitor (mobile)** | Large bundles, Mac App Store risk, but keep web UI; not recommended for mobile |

---

## Appendix: Current Sonia Stack Compatibility

| Component | Tauri v2 Compatibility | Migration Effort |
|-----------|------------------------|------------------|
| `index.html` + vanilla JS | ✅ Runs as-is in WebView | None |
| `app.js` (UI logic, tabs, chat) | ✅ Runs as-is | None |
| `3d-kb.js` (Three.js brain) | ✅ Full WebGL2 in WebView | None |
| `sister-autonomy.js` (background) | ⚠️ Move to Rust tokio tasks | Medium (port to Rust) |
| `app.py` / `ai-backend.py` (Python) | ✅ Run as sidecar/HTTP | Low (keep as-is, call via Tauri commands) |
| `wiki/`, `.agents/`, `vault/` file access | ✅ `tauri-plugin-fs` + `notify` crate | Low |
| `.desktop` launcher | ✅ Replace with `.appimage`/`.deb` | Low |
| Three.js (r155+) | ✅ WebGL2 supported on all WebViews | None |

---

## Decision: **Proceed with Tauri v2**

**Next Steps:**
1. Initialize Tauri v2 project in `/home/bclerjuste/ai-workplace/desktop-app/`
2. Configure `tauri.conf.json` to serve `/public` as frontend
3. Add required plugins (`fs`, `shell`, `process`, `notification`, `push`, `updater`)
4. Create Rust commands to bridge Python backend
5. Implement background sister autonomy as Tokio tasks
6. Build and test Linux AppImage → then Android/iOS

---

*Document saved to: `/home/bclerjuste/ai-workplace/desktop-app/research/framework-decision.md`*