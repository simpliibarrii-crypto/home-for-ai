FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y --no-install-recommends \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libgtk-3-dev \
    libsoup-3.0-dev \
    libjavascriptcoregtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Tauri CLI
RUN cargo install tauri-cli --version "^2.0"

# Keep the container running
CMD ["sleep", "infinity"]
