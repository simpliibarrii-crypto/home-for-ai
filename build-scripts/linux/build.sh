#!/bin/bash
# Linux Build Script for AI Workplace Desktop App
# Builds AppImage, .deb, and .rpm packages

set -euo pipefail

# Configuration
APP_NAME="ai-workplace"
VERSION="${VERSION:-1.0.0}"
ARCH="${ARCH:-$(uname -m)}"
BUILD_DIR="$(pwd)/dist"
SRC_DIR="$(pwd)"
TAURI_DIR="$SRC_DIR/src-tauri"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=()
    
    command -v cargo >/dev/null 2>&1 || missing+=("cargo (Rust)")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v tauri >/dev/null 2>&1 || missing+=("tauri-cli (cargo install tauri-cli)")
    
    # Linux-specific
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        command -v appimagetool >/dev/null 2>&1 || missing+=("appimagetool")
        command -v dpkg-deb >/dev/null 2>&1 || missing+=("dpkg-deb")
        command -v rpmbuild >/dev/null 2>&1 || missing+=("rpmbuild")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing prerequisites:"
        for item in "${missing[@]}"; do
            echo "  - $item"
        done
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Install npm dependencies
install_dependencies() {
    log_info "Installing npm dependencies..."
    cd "$SRC_DIR"
    npm ci
    log_success "Dependencies installed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    cd "$SRC_DIR"
    npm run build
    log_success "Frontend built"
}

# Build Tauri app
build_tauri() {
    log_info "Building Tauri app (release)..."
    cd "$TAURI_DIR"
    cargo tauri build --target "${TARGET:-}"
    log_success "Tauri app built"
}

# Build AppImage
build_appimage() {
    log_info "Building AppImage..."
    cd "$TAURI_DIR"
    
    # Tauri v2 handles AppImage generation automatically
    # This is for custom AppImage if needed
    if command -v appimagetool >/dev/null 2>&1; then
        local APPIMAGE_DIR="$BUILD_DIR/appimage"
        mkdir -p "$APPIMAGE_DIR"
        
        # Copy the built binary
        local BINARY=$(find target/release -maxdepth 1 -type f -executable -name "$APP_NAME" 2>/dev/null | head -1)
        if [[ -n "$BINARY" ]]; then
            cp "$BINARY" "$APPIMAGE_DIR/"
            # AppImage creation would go here
            log_success "AppImage prepared at $APPIMAGE_DIR"
        fi
    fi
}

# Build .deb package
build_deb() {
    log_info "Building .deb package..."
    cd "$TAURI_DIR"
    
    # Tauri v2 handles .deb generation automatically
    # This is for custom .deb if needed
    local DEB_DIR="$BUILD_DIR/deb"
    mkdir -p "$DEB_DIR"
    
    # The .deb will be in target/release/bundle/deb/
    find target/release/bundle/deb -name "*.deb" -exec cp {} "$DEB_DIR/" \; 2>/dev/null || true
    
    log_success "Deb packages copied to $DEB_DIR"
}

# Build .rpm package
build_rpm() {
    log_info "Building .rpm package..."
    cd "$TAURI_DIR"
    
    local RPM_DIR="$BUILD_DIR/rpm"
    mkdir -p "$RPM_DIR"
    
    # The .rpm will be in target/release/bundle/rpm/
    find target/release/bundle/rpm -name "*.rpm" -exec cp {} "$RPM_DIR/" \; 2>/dev/null || true
    
    log_success "RPM packages copied to $RPM_DIR"
}

# Main build function
main() {
    log_info "Starting Linux build for $APP_NAME v$VERSION ($ARCH)"
    
    # Parse arguments
    BUILD_APPIMAGE=false
    BUILD_DEB=false
    BUILD_RPM=false
    BUILD_ALL=true
    UILD_TAURI=true
    SKIP_DEPS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --appimage)
                BUILD_APPIMAGE=true
                BUILD_ALL=false
                shift
                ;;
            --deb)
                BUILD_DEB=true
                BUILD_ALL=false
                shift
                ;;
            --rpm)
                BUILD_RPM=true
                BUILD_ALL=false
                shift
                ;;
            --tauri-only)
                BUILD_TAURI=true
                BUILD_ALL=false
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --arch)
                ARCH="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --appimage       Build AppImage only"
                echo "  --deb            Build .deb only"
                echo "  --rpm            Build .rpm only"
                echo "  --tauri-only     Build Tauri binary only"
                echo "  --skip-deps      Skip npm dependency installation"
                echo "  --version VER    Set version (default: 1.0.0)"
                echo "  --arch ARCH      Set architecture (default: auto)"
                echo "  --help           Show this help"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    if [[ "$SKIP_DEPS" != "true" ]]; then
        install_dependencies
    fi
    
    # Build frontend
    build_frontend
    
    # Build Tauri
    if [[ "$BUILD_TAURI" == "true" || "$BUILD_ALL" == "true" ]]; then
        build_tauri
    fi
    
    # Build packages
    if [[ "$BUILD_ALL" == "true" || "$BUILD_APPIMAGE" == "true" ]]; then
        build_appimage
    fi
    
    if [[ "$BUILD_ALL" == "true" || "$BUILD_DEB" == "true" ]]; then
        build_deb
    fi
    
    if [[ "$BUILD_ALL" == "true" || "$BUILD_RPM" == "true" ]]; then
        build_rpm
    fi
    
    log_success "Build completed! Artifacts in $BUILD_DIR"
    
    # List artifacts
    log_info "Build artifacts:"
    find "$BUILD_DIR" -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" \) | sort
}

main "$@"