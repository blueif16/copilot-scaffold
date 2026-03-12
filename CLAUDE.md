# Omniscience Project Instructions

## Infrastructure

- **Docker context is remote**: All Docker operations (docker-compose, docker build, docker exec) run on the remote server, not locally. The Docker context is already configured and active.

## Local Development

**CRITICAL: Always use the venv Python, not system Python**

To start local development:
```bash
cp .env.local.dev .env.local
./startup.sh
```

The startup script:
- Uses `agent/.venv/bin/python` for the backend (NOT system python)
- Starts backend on port 8123
- Starts frontend on port 3000
- Logs to `.logs/backend.log` and `.logs/frontend.log`

**Manual backend start (for debugging):**
```bash
agent/.venv/bin/python -m uvicorn agent.main:app --host 0.0.0.0 --port 8123 --reload
```

- Local frontend: http://localhost:3000
- Remote frontend: http://66.42.117.148:3082
