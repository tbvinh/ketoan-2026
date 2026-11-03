#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker daemon is not running." >&2; exit 1; }

if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "Docker Compose is not installed." >&2
    exit 1
fi

echo "Preparing ./postgres_data..."
mkdir -p "$SCRIPT_DIR/postgres_data"
if [ -z "$(ls -A "$SCRIPT_DIR/postgres_data" 2>/dev/null)" ]; then
    chmod 777 "$SCRIPT_DIR/postgres_data" 2>/dev/null || true
    if [ "$(id -u 2>/dev/null || echo 1)" -eq 0 ]; then
        chown 70:70 "$SCRIPT_DIR/postgres_data" 2>/dev/null || true
        chmod 700 "$SCRIPT_DIR/postgres_data" 2>/dev/null || true
    fi
fi

echo "Preparing ./uploads..."
mkdir -p "$SCRIPT_DIR/uploads"
chmod -R a+rwX "$SCRIPT_DIR/uploads" 2>/dev/null || true

echo "Loading Docker images..."
shopt -s nullglob
archives=(images/*.tar.gz images/*.tar)
shopt -u nullglob
if [ ${#archives[@]} -eq 0 ]; then
    echo "No Docker image archives found in ./images." >&2
    exit 1
fi
for archive in "${archives[@]}"; do
    echo "  -> Loading $archive..."
    docker load -i "$archive"
done

if [ ! -f "$SCRIPT_DIR/.env" ]; then
    tr -d '\r' < "$SCRIPT_DIR/.env.example" > "$SCRIPT_DIR/.env"
    if command -v openssl >/dev/null 2>&1; then
        PASSWORD="$(openssl rand -hex 16)"
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${PASSWORD}/" "$SCRIPT_DIR/.env"
    fi
    echo "Created .env from .env.example."
fi

while IFS='=' read -r KEY VALUE || [ -n "${KEY:-}" ]; do
    KEY="${KEY%$'\r'}"
    VALUE="${VALUE%$'\r'}"
    case "$KEY" in
        ''|\#*) continue ;;
    esac
    if ! grep -q "^${KEY}=" "$SCRIPT_DIR/.env"; then
        printf '%s=%s\n' "$KEY" "$VALUE" >> "$SCRIPT_DIR/.env"
    fi
done < "$SCRIPT_DIR/.env.example"

chmod +x "$SCRIPT_DIR/install.sh" "$SCRIPT_DIR/start.sh" 2>/dev/null || true

$COMPOSE config -q
echo "Installation complete. Run ./start.sh to start the application."
