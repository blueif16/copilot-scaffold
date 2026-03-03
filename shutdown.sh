#!/bin/bash

# Omniscience — Shutdown Script
# Stops both frontend and backend servers

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/.logs"

echo "🛑 Stopping Omniscience servers..."

# Read PIDs from files
if [ -f "$LOG_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$LOG_DIR/frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "   Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID"
    fi
    rm "$LOG_DIR/frontend.pid"
fi

if [ -f "$LOG_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$LOG_DIR/backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "   Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID"
    fi
    rm "$LOG_DIR/backend.pid"
fi

# Fallback: kill by port
echo "   Cleaning up any remaining processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8123 | xargs kill -9 2>/dev/null || true

echo "✅ All servers stopped"
