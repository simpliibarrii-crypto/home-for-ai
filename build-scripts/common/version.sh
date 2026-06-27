#!/bin/bash
# Version Management Script
# Handles version bumping across all configuration files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

get_current_version() {
    # Try to get version from package.json
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        grep '"version"' "$PROJECT_ROOT/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
        return
    fi
    
    # Try Cargo.toml
    if [[ -f "$PROJECT_ROOT/Cargo.toml" ]]; then
        grep '^version' "$PROJECT_ROOT/Cargo.toml" | head -1 | sed 's/.*= "\(.*\)".*/\1/'
        return
    fi
    
    # Try tauri.conf.json
    if [[ -f "$PROJECT_ROOT/src-tauri/tauri.conf.json" ]]; then
        grep '"version"' "$PROJECT_ROOT/src-tauri/tauri.conf.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
        return
    fi
    
    echo "1.0.0"
}

update_version_in_file() {
    local file="$1"
    local old_version="$2"
    local new_version="$3"
    
    if [[ ! -f "$file" ]]; then
        log_warning "File not found: $file"
        return 1
    fi
    
    # Use sed to replace version
    sed -i "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/g" "$file"
    sed -i "s/version = \"$old_version\"/version = \"$new_version\"/g" "$file"
    sed -i "s/versionName \"$old_version\"/versionName \"$new_version\"/g" "$file"
    sed -i "s/versionCode [0-9]*/versionCode $(( $(echo $new_version | tr '.' ' ' | awk '{print $1*10000 + $2*100 + $3}') ))/g" "$file"
    
    log_info "Updated $file"
}

main() {
    local new_version="${1:-}"
    
    if [[ -z "$new_version" ]]; then
        local current=$(get_current_version)
        echo "Current version: $current"
        echo "Usage: $0 <new_version>"
        echo "Example: $0 1.1.0"
        exit 1
    fi
    
    local current=$(get_current_version)
    
    if [[ "$current" == "$new_version" ]]; then
        log_info "Version already set to $new_version"
        exit 0
    fi
    
    log_info "Bumping version from $current to $new_version"
    
    # Files to update
    local files=(
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/Cargo.toml"
        "$PROJECT_ROOT/src-tauri/Cargo.toml"
        "$PROJECT_ROOT/src-tauri/tauri.conf.json"
    )
    
    # Add Android build.gradle.kts if exists
    if [[ -f "$PROJECT_ROOT/android/app/build.gradle.kts" ]]; then
        files+=("$PROJECT_ROOT/android/app/build.gradle.kts")
    fi
    
    # Add iOS Info.plist if exists
    if [[ -f "$PROJECT_ROOT/ios/Runner/Info.plist" ]]; then
        files+=("$PROJECT_ROOT/ios/Runner/Info.plist")
    fi
    
    for file in "${files[@]}"; do
        update_version_in_file "$file" "$current" "$new_version"
    done
    
    log_success "Version bumped to $new_version"
    
    # Show git diff
    if command -v git >/dev/null 2>&1 && git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
        echo ""
        log_info "Git diff:"
        git -C "$PROJECT_ROOT" diff
    fi
}

main "$@"