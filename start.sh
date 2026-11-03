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

if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "Missing .env. Run ./install.sh first." >&2
    exit 1
fi

echo "Starting containers..."
$COMPOSE up -d

ATTEMPT=0
while [ "$ATTEMPT" -lt 60 ]; do
    POSTGRES_ID="$($COMPOSE ps -q postgres)"
    STATUS=""
    if [ -n "$POSTGRES_ID" ]; then
        STATUS="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$POSTGRES_ID" 2>/dev/null || true)"
    fi
    case "$STATUS" in
        healthy) break ;;
        exited|dead)
            echo "PostgreSQL container failed to start." >&2
            $COMPOSE logs --tail=50 postgres >&2
            exit 1
            ;;
    esac
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

if [ "${STATUS:-}" != "healthy" ]; then
    echo "PostgreSQL did not become healthy in time." >&2
    $COMPOSE logs --tail=50 postgres >&2
    exit 1
fi
echo "PostgreSQL is healthy."

ATTEMPT=0
STARTED=false
while [ "$ATTEMPT" -lt 60 ]; do
    APP_ID="$($COMPOSE ps -q app)"
    RUNNING=""
    if [ -n "$APP_ID" ]; then
        RUNNING="$(docker inspect -f '{{.State.Running}}' "$APP_ID" 2>/dev/null || true)"
    fi
    if [ "$RUNNING" != "true" ]; then
        echo "Quarkus container is not running." >&2
        $COMPOSE logs --tail=50 app >&2
        exit 1
    fi
    if $COMPOSE logs --no-color app 2>/dev/null | grep -Eq "started in|Listening on:"; then
        STARTED=true
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

if [ "$STARTED" != true ]; then
    echo "Quarkus did not report a successful startup in time." >&2
    $COMPOSE logs --tail=50 app >&2
    exit 1
fi

echo "Quarkus backend started successfully."
$COMPOSE ps
