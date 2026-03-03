#!/bin/bash

# Omniscience — Development Startup Script
# Starts both frontend (Next.js) and backend (LangGraph) with logging

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/.logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"

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

# Start backend (LangGraph)
echo "🔧 Starting LangGraph backend..."
cd "$PROJECT_ROOT/agent"
source .venv/bin/activate
langgraph dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to be ready..."
sleep 3

# Start frontend (Next.js)
echo "🎨 Starting Next.js frontend..."
cd "$PROJECT_ROOT"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "   Waiting for frontend to be ready..."
sleep 5

echo ""
echo "✅ Both servers started!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:8123"
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

# Keep script running and tail both logs
echo "📡 Streaming logs (Ctrl+C to stop)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f "$FRONTEND_LOG" "$BACKEND_LOG"
