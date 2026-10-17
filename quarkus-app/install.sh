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
chmod 777 "$SCRIPT_DIR/postgres_data"
if [ "$(id -u)" -eq 0 ]; then
    chown 999:999 "$SCRIPT_DIR/postgres_data"
fi

echo "Preparing ./uploads..."
mkdir -p "$SCRIPT_DIR/uploads"
chmod 777 "$SCRIPT_DIR/uploads"

echo "Loading Docker images..."
shopt -s nullglob
archives=(images/*.tar.gz images/*.tar)
shopt -u nullglob
if [ ${#archives[@]} -eq 0 ]; then
    echo "No Docker image archives found in ./images." >&2
    exit 1
fi
for archive in "${archives[@]}"; do
    docker load -i "$archive"
done

if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    if command -v openssl >/dev/null 2>&1; then
        PASSWORD="$(openssl rand -hex 16)"
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${PASSWORD}/" "$SCRIPT_DIR/.env"
    fi
    echo "Created .env from .env.example."
fi

while IFS='=' read -r KEY VALUE; do
    case "$KEY" in
        ''|\#*) continue ;;
    esac
    if ! grep -q "^${KEY}=" "$SCRIPT_DIR/.env"; then
        printf '%s=%s\n' "$KEY" "$VALUE" >> "$SCRIPT_DIR/.env"
    fi
done < "$SCRIPT_DIR/.env.example"

chmod +x "$SCRIPT_DIR/install.sh" "$SCRIPT_DIR/start.sh"

$COMPOSE config -q
echo "Installation complete."
