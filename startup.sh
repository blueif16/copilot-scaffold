#!/bin/bash

# Omniscience — Development Startup Script
# Starts both frontend (Next.js) and backend (LangGraph) with logging

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/.logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"
BACKEND_PORT=8123
FRONTEND_PORT=3000

# Create logs directory
mkdir -p "$LOG_DIR"

# Clear previous logs
> "$FRONTEND_LOG"
> "$BACKEND_LOG"

echo "🚀 Starting Omniscience development environment..."
echo ""
echo "📁 Project root: $PROJECT_ROOT"
echo "📝 Frontend logs: $FRONTEND_LOG"
echo "📝 Backend logs:  $BACKEND_LOG"
echo ""

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "⚠️  Please edit .env and add your GOOGLE_API_KEY"
    exit 1
fi

# Check for GOOGLE_API_KEY
if ! grep -q "^GOOGLE_API_KEY=..*" "$PROJECT_ROOT/.env"; then
    echo "❌ Error: GOOGLE_API_KEY not set in .env"
    echo "   Please edit .env and uncomment/set GOOGLE_API_KEY"
    exit 1
fi

# Check if backend port is already in use
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    EXISTING_PID=$(lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t)
    echo "⚠️  Port $BACKEND_PORT is already in use by PID $EXISTING_PID"
    echo "   Killing existing process..."
    kill $EXISTING_PID 2>/dev/null || true
    sleep 2
    # Force kill if still running
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill -9 $EXISTING_PID 2>/dev/null || true
        sleep 1
    fi
fi

# Check if frontend port is already in use
if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    EXISTING_PID=$(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t)
    echo "⚠️  Port $FRONTEND_PORT is already in use by PID $EXISTING_PID"
    echo "   Killing existing process..."
    kill $EXISTING_PID 2>/dev/null || true
    sleep 2
    # Force kill if still running
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill -9 $EXISTING_PID 2>/dev/null || true
        sleep 1
    fi
fi

# Start backend (FastAPI with uvicorn)
echo "🔧 Starting FastAPI backend..."
cd "$PROJECT_ROOT/agent"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start and verify
echo "   Waiting for backend to be ready..."
for i in {1..10}; do
    sleep 1
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "   ✅ Backend is ready!"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ❌ Backend failed to start. Check logs: tail -f $BACKEND_LOG"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
done

# Start frontend (Next.js)
echo "🎨 Starting Next.js frontend..."
cd "$PROJECT_ROOT"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start and verify
echo "   Waiting for frontend to be ready..."
for i in {1..15}; do
    sleep 1
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "   ✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "   ❌ Frontend failed to start. Check logs: tail -f $FRONTEND_LOG"
        kill $FRONTEND_PID 2>/dev/null || true
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
done

echo ""
echo "✅ Both servers started!"
echo ""
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔌 Backend:  http://localhost:$BACKEND_PORT"
echo ""
echo "📊 To view logs in real-time:"
echo "   Frontend: tail -f $FRONTEND_LOG"
echo "   Backend:  tail -f $BACKEND_LOG"
echo ""
echo "🛑 To stop both servers:"
echo "   kill $FRONTEND_PID $BACKEND_PID"
echo ""
echo "💡 Tip: Run 'tail -f .logs/*.log' to watch both logs simultaneously"
echo ""

# Save PIDs to file for easy cleanup
echo "$FRONTEND_PID" > "$LOG_DIR/frontend.pid"
echo "$BACKEND_PID" > "$LOG_DIR/backend.pid"

# Trap Ctrl+C to clean up processes
trap "echo ''; echo '🛑 Shutting down...'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit 0" INT TERM

# Keep script running and tail both logs
echo "📡 Streaming logs (Ctrl+C to stop)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f "$FRONTEND_LOG" "$BACKEND_LOG"
