# Omniscience - Quick Start Guide

## The Problem (Fixed)

The AI companion was showing as offline because `langgraph dev` doesn't serve the FastAPI endpoints defined in `main.py`. The system now uses `uvicorn` to run the FastAPI app directly.

## Starting the System

### Option 1: Automated Startup (Recommended)

```bash
./startup.sh
```

This script will:
- Check for `.env` file and API keys
- Kill any existing processes on ports 3000 and 8123
- Start the FastAPI backend on port 8123
- Start the Next.js frontend on port 3000
- Stream logs from both services

Press `Ctrl+C` to stop both servers.

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd agent
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8123 --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Verifying the System

Run this quick test:
```bash
# Backend health
curl http://localhost:8123/health

# Frontend health
curl http://localhost:3000/api/copilotkit

# Agent endpoints
curl http://localhost:8123/agent/observation-changing-states/health
curl http://localhost:8123/agent/chat-changing-states/health
```

All should return `{"status":"ok"}` or similar.

## Using the Application

1. Open http://localhost:3000 in your browser
2. Click on "Changing States" topic
3. Interact with the simulation:
   - Click "Heat" to increase temperature
   - Click "Cool" to decrease temperature
   - Watch particles change between solid, liquid, and gas
4. The AI companion (bottom-right) will react to your actions
5. Click the companion avatar to open chat and ask questions

## Architecture

```
Browser
  ↓
Next.js Frontend (localhost:3000)
  ↓
CopilotKit Runtime (/api/copilotkit)
  ↓
FastAPI Backend (localhost:8123)
  ↓
LangGraph Agents
  ├── observation-changing-states (watches simulation events)
  └── chat-changing-states (answers questions)
```

## Important Files

- `startup.sh` - Automated startup script (now uses `uvicorn` instead of `langgraph dev`)
- `.env` - Environment variables (contains `GOOGLE_API_KEY`)
- `agent/main.py` - FastAPI app with agent endpoints
- `agent/langgraph.json` - LangGraph configuration
- `app/api/copilotkit/route.ts` - CopilotKit runtime configuration

## Troubleshooting

### "AI companion offline" warning

This means the frontend can't reach the backend. Check:
1. Is the backend running? `curl http://localhost:8123/health`
2. Are you using `uvicorn` (not `langgraph dev`)? Check with `ps aux | grep uvicorn`
3. Is the port correct? Backend should be on 8123, frontend on 3000

### Backend won't start

- Check if port 8123 is already in use: `lsof -i :8123`
- Verify `.env` file exists and has `GOOGLE_API_KEY` set
- Check Python virtual environment is activated

### Frontend won't start

- Check if port 3000 is already in use: `lsof -i :3000`
- Try `npm install` if dependencies are missing
- Clear Next.js cache: `rm -rf .next`

## API Documentation

Once the backend is running, view the interactive API docs at:
- http://localhost:8123/docs (Swagger UI)
- http://localhost:8123/redoc (ReDoc)

## Stopping the System

If using `startup.sh`:
- Press `Ctrl+C` in the terminal

If running manually:
- Press `Ctrl+C` in each terminal
- Or kill processes: `pkill -f "uvicorn main:app"` and `pkill -f "next dev"`
