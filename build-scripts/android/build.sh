#!/bin/bash
# Android Build Script for AI Workplace Desktop App
# Builds .apk and .aab for Android distribution

set -euo pipefail

# Configuration
APP_NAME="ai-workplace"
PACKAGE_NAME="com.aiworkplace.desktop"
VERSION="${VERSION:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
BUILD_DIR="$(pwd)/dist/android"
SRC_DIR="$(pwd)"
ANDROID_DIR="$SRC_DIR/android"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_prerequisites() {
    log_info "Checking Android build prerequisites..."
    
    local missing=()
    
    command -v cargo >/dev/null 2>&1 || missing+=("cargo (Rust)")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v tauri >/dev/null 2>&1 || missing+=("tauri-cli (cargo install tauri-cli)")
    command -v java >/dev/null 2>&1 || missing+=("Java JDK 17+")
    
    # Check Android SDK
    if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
        missing+=("ANDROID_HOME or ANDROID_SDK_ROOT environment variable")
    fi
    
    # Check for adb
    command -v adb >/dev/null 2>&1 || missing+=("adb (Android SDK Platform Tools)")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing prerequisites:"
        for item in "${missing[@]}"; do echo "  - $item"; done
        exit 1
    fi
    
    # Check Java version
    local java_version=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [[ "$java_version" -lt 17 ]]; then
        log_warning "Java version $java_version detected. Java 17+ recommended."
    fi
    
    log_success "Prerequisites met"
}

install_dependencies() {
    log_info "Installing dependencies..."
    cd "$SRC_DIR"
    npm ci
    log_success "Dependencies installed"
}

build_frontend() {
    log_info "Building frontend..."
    cd "$SRC_DIR"
    npm run build
    log_success "Frontend built"
}

build_tauri_android() {
    log_info "Building Tauri Android app..."
    cd "$SRC_DIR/src-tauri"
    
    # Build for Android
    cargo tauri android build \
        --target aarch64-linux-android \
        --target armv7-linux-androideabi \
        --target x86_64-linux-android \
        --target i686-linux-android
    
    log_success "Tauri Android app built"
}

build_apk() {
    log_info "Building APK..."
    cd "$ANDROID_DIR"
    
    # Build debug APK
    ./gradlew assembleDebug
    
    # Build release APK (requires signing config)
    if [[ -f "keystore.properties" ]]; then
        ./gradlew assembleRelease
    else
        log_warning "keystore.properties not found, skipping release APK"
    fi
    
    # Copy APKs to build directory
    mkdir -p "$BUILD_DIR"
    find . -name "*.apk" -path "*/build/outputs/apk/*" -exec cp {} "$BUILD_DIR/" \; 2>/dev/null || true
    
    log_success "APKs copied to $BUILD_DIR"
}

build_aab() {
    log_info "Building AAB (Android App Bundle)..."
    cd "$ANDROID_DIR"
    
    # Build release AAB (requires signing config)
    if [[ -f "keystore.properties" ]]; then
        ./gradlew bundleRelease
        
        # Copy AAB to build directory
        mkdir -p "$BUILD_DIR"
        find . -name "*.aab" -path "*/build/outputs/bundle/*" -exec cp {} "$BUILD_DIR/" \; 2>/dev/null || true
        
        log_success "AAB copied to $BUILD_DIR"
    else
        log_warning "keystore.properties not found, skipping AAB build"
        log_info "Create android/keystore.properties with signing config for release builds"
    fi
}

create_keystore_template() {
    cat > "$ANDROID_DIR/keystore.properties.template" << 'EOF'
# Android Keystore Configuration
# Copy this file to keystore.properties and fill in your values
# DO NOT commit keystore.properties to version control!

storeFile=../keystore.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
EOF
    
    log_info "Created keystore.properties.template at $ANDROID_DIR/keystore.properties.template"
    log_info "Copy to keystore.properties and configure for release builds"
}

main() {
    log_info "Starting Android build for $APP_NAME v$VERSION ($VERSION_CODE)"
    
    # Parse arguments
    BUILD_APK=true
    BUILD_AAB=false
    BUILD_DEBUG=true
    BUILD_RELEASE=false
    SKIP_DEPS=false
    CLEAN=false
    CREATE_KEYSTORE_TEMPLATE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --apk)
                BUILD_APK=true
                BUILD_AAB=false
                shift
                ;;
            --aab)
                BUILD_AAB=true
                BUILD_APK=false
                shift
                ;;
            --both)
                BUILD_APK=true
                BUILD_AAB=true
                shift
                ;;
            --debug)
                BUILD_DEBUG=true
                BUILD_RELEASE=false
                shift
                ;;
            --release)
                BUILD_RELEASE=true
                BUILD_DEBUG=false
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --create-keystore-template)
                CREATE_KEYSTORE_TEMPLATE=true
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --version-code)
                VERSION_CODE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --apk                    Build APK only"
                echo "  --aab                    Build AAB only"
                echo "  --both                   Build both APK and AAB"
                echo "  --debug                  Build debug (default)"
                echo "  --release                Build release (requires signing)"
                echo "  --skip-deps              Skip dependency installation"
                echo "  --clean                  Clean build directory first"
                echo "  --create-keystore-template  Create keystore.properties template"
                echo "  --version VER            Set version name"
                echo "  --version-code N         Set version code"
                echo "  --help                   Show this help"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    mkdir -p "$BUILD_DIR"
    
    if [[ "$CLEAN" == "true" ]]; then
        log_info "Cleaning build directory..."
        rm -rf "$BUILD_DIR"/*
        cd "$ANDROID_DIR" && ./gradlew clean
    fi
    
    if [[ "$CREATE_KEYSTORE_TEMPLATE" == "true" ]]; then
        create_keystore_template
        exit 0
    fi
    
    check_prerequisites
    
    if [[ "$SKIP_DEPS" != "true" ]]; then
        install_dependencies
    fi
    
    build_frontend
    
    # Set version in Tauri config if needed
    # This would update tauri.conf.json version
    
    build_tauri_android
    
    if [[ "$BUILD_APK" == "true" ]]; then
        build_apk
    fi
    
    if [[ "$BUILD_AAB" == "true" ]]; then
        build_aab
    fi
    
    log_success "Android build completed! Artifacts in $BUILD_DIR"
    
    # List artifacts
    find "$BUILD_DIR" -type f \( -name "*.apk" -o -name "*.aab" \) | sort
}

main "$@"