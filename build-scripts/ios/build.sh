#!/bin/bash
# iOS Build Script for AI Workplace Desktop App
# Builds .app and .ipa for iOS distribution

set -euo pipefail

# Configuration
APP_NAME="AI Workplace"
BUNDLE_ID="com.aiworkplace.desktop"
VERSION="${VERSION:-1.0.0}"
BUILD_NUMBER="${BUILD_NUMBER:-1}"
CONFIGURATION="${CONFIGURATION:-Release}"
BUILD_DIR="$(pwd)/dist/ios"
SRC_DIR="$(pwd)"
IOS_DIR="$SRC_DIR/ios"

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
    log_info "Checking iOS build prerequisites..."
    
    local missing=()
    
    # macOS only
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "iOS builds require macOS"
        exit 1
    fi
    
    command -v xcodebuild >/dev/null 2>&1 || missing+=("Xcode Command Line Tools")
    command -v xcrun >/dev/null 2>&1 || missing+=("Xcode Command Line Tools")
    command -v cargo >/dev/null 2>&1 || missing+=("cargo (Rust)")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v tauri >/dev/null 2>&1 || missing+=("tauri-cli")
    command -v fastlane >/dev/null 2>&1 || missing+=("fastlane (gem install fastlane)")
    
    # Check for signing identity
    if ! security find-identity -v -p codesigning | grep -q "Apple Development\|Apple Distribution\|iPhone Developer\|iPhone Distribution"; then
        log_warning "No code signing identity found. Build will fail for device distribution."
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing prerequisites:"
        for item in "${missing[@]}"; do echo "  - $item"; done
        exit 1
    fi
    
    log_success "Prerequisites met"
}

install_dependencies() {
    log_info "Installing dependencies..."
    cd "$SRC_DIR"
    npm ci
    
    log_info "Installing CocoaPods dependencies..."
    cd "$IOS_DIR"
    pod install --repo-update
    
    log_success "Dependencies installed"
}

build_frontend() {
    log_info "Building frontend..."
    cd "$SRC_DIR"
    npm run build
    log_success "Frontend built"
}

build_tauri_ios() {
    log_info "Building Tauri iOS app..."
    cd "$SRC_DIR/src-tauri"
    
    # Build for iOS simulator (for testing)
    if [[ "${TARGET:-}" == "simulator" ]]; then
        cargo tauri ios build --target aarch64-apple-ios-sim
    else
        # Build for device
        cargo tauri ios build --target aarch64-apple-ios
    fi
    
    log_success "Tauri iOS app built"
}

build_ipa() {
    log_info "Building IPA with Fastlane..."
    cd "$IOS_DIR"
    
    # Use Fastlane for IPA building
    if [[ -f "Fastfile" ]]; then
        fastlane ios build_ipa \
            configuration:"$CONFIGURATION" \
            version:"$VERSION" \
            build_number:"$BUILD_NUMBER" \
            output_directory:"$BUILD_DIR"
    else
        log_warning "Fastfile not found, using xcodebuild directly"
        build_ipa_xcodebuild
    fi
    
    log_success "IPA built"
}

build_ipa_xcodebuild() {
    log_info "Building IPA with xcodebuild..."
    
    local WORKSPACE=$(find . -name "*.xcworkspace" | head -1)
    local SCHEME="Runner"
    
    if [[ -z "$WORKSPACE" ]]; then
        log_error "No .xcworkspace found"
        exit 1
    fi
    
    # Archive
    xcodebuild -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -configuration "$CONFIGURATION" \
        -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
        -destination "generic/platform=iOS" \
        archive \
        CODE_SIGN_IDENTITY="" \
        CODE_SIGNING_REQUIRED=NO \
        CODE_SIGNING_ALLOWED=NO
    
    # Export IPA
    xcodebuild -exportArchive \
        -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
        -exportPath "$BUILD_DIR" \
        -exportOptionsPlist exportOptions.plist
}

create_export_options() {
    cat > "$IOS_DIR/exportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>${TEAM_ID:-}</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
}

main() {
    log_info "Starting iOS build for $APP_NAME v$VERSION ($BUILD_NUMBER)"
    
    # Parse arguments
    BUILD_SIMULATOR=false
    BUILD_DEVICE=true
    BUILD_IPA=true
    SKIP_DEPS=false
    CLEAN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --simulator)
                BUILD_SIMULATOR=true
                BUILD_DEVICE=false
                shift
                ;;
            --device)
                BUILD_DEVICE=true
                BUILD_SIMULATOR=false
                shift
                ;;
            --no-ipa)
                BUILD_IPA=false
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
            --version)
                VERSION="$2"
                shift 2
                ;;
            --build-number)
                BUILD_NUMBER="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --simulator      Build for iOS Simulator"
                echo "  --device         Build for iOS Device (default)"
                echo "  --no-ipa         Skip IPA creation"
                echo "  --skip-deps      Skip dependency installation"
                echo "  --clean          Clean build directory first"
                echo "  --version VER    Set version"
                echo "  --build-number N Set build number"
                echo "  --help           Show this help"
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
    fi
    
    check_prerequisites
    
    if [[ "$SKIP_DEPS" != "true" ]]; then
        install_dependencies
    fi
    
    build_frontend
    
    # Set target for Tauri
    if [[ "$BUILD_SIMULATOR" == "true" ]]; then
        export TARGET="aarch64-apple-ios-sim"
    else
        export TARGET="aarch64-apple-ios"
    fi
    
    build_tauri_ios
    
    if [[ "$BUILD_IPA" == "true" && "$BUILD_DEVICE" == "true" ]]; then
        create_export_options
        build_ipa
    fi
    
    log_success "iOS build completed! Artifacts in $BUILD_DIR"
    
    # List artifacts
    find "$BUILD_DIR" -type f \( -name "*.app" -o -name "*.ipa" -o -name "*.xcarchive" \) | sort
}

main "$@"