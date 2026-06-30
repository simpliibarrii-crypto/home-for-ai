# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

# Install build tools
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Copy go module files first for dependency caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build a static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /gateway \
    ./main.go

# ─── Stage 2: Final (scratch) ─────────────────────────────────────────────────
FROM scratch

# Import CA certificates and timezone data from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /gateway /gateway

# Create non-root user entries in /etc/passwd (scratch has no useradd)
# UID 1001, GID 1001 → "appuser"
COPY --from=builder /etc/passwd /etc/passwd
USER 1001

# Expose gateway port
EXPOSE 3000

# Healthcheck: probe /health every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/gateway", "-health-check"] || exit 1

ENTRYPOINT ["/gateway"]
