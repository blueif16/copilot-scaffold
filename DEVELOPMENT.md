# Omniscience Development Scripts

## Quick Start

### Start both servers
```bash
./startup.sh
```

This will:
- Check for `.env` file and `GOOGLE_API_KEY`
- Start LangGraph backend on port 8123
- Start Next.js frontend on port 3000
- Stream logs from both servers

### Stop both servers
```bash
./shutdown.sh
```

Or press `Ctrl+C` in the startup.sh terminal.

## Logs

Logs are saved to `.logs/` directory:
- `.logs/frontend.log` - Next.js output
- `.logs/backend.log` - LangGraph output

View logs in real-time:
```bash
# Both logs
tail -f .logs/*.log

# Frontend only
tail -f .logs/frontend.log

# Backend only
tail -f .logs/backend.log
```

## Manual Start (Alternative)

If you prefer to run servers in separate terminals:

**Terminal 1 - Backend:**
```bash
cd agent
source .venv/bin/activate
langgraph dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Environment Setup

Before first run, ensure `.env` has your API key:
```bash
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=your_key_here
```

## URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:8123
- LangGraph Studio: http://localhost:8123/studio (if available)

## Python Version

The project uses **Python 3.12.12** (installed in `agent/.venv`).
