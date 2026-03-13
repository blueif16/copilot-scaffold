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

## Testing Backend Agents

**NEVER run `npm run build` or `npm run dev` manually** — `./startup.sh` is always running in the background. Running build commands will kill the dev server and waste time.

**Direct agent testing (no frontend needed):**
```bash
# Start backend
agent/.venv/bin/python -m uvicorn agent.main:app --host 127.0.0.1 --port 8123

# Test course-builder agent
curl -X POST http://127.0.0.1:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-1","runId":"run-1","state":{"files":{},"uploaded_images":[]},"messages":[{"id":"msg-1","role":"user","content":"你好"}],"tools":[],"context":[],"forwardedProps":{}}'

# Test chat agent
curl -X POST http://127.0.0.1:8123/agents/chat-changing-states \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-1","runId":"run-1","state":{"simulation":{},"companion":{},"events":{}},"messages":[{"id":"msg-1","role":"user","content":"hello"}],"tools":[],"context":[],"forwardedProps":{}}'

# Multi-turn conversation (use same threadId)
curl -X POST http://127.0.0.1:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-1","runId":"run-2","state":{"files":{},"uploaded_images":[]},"messages":[{"id":"msg-1","role":"user","content":"你好"},{"id":"msg-2","role":"assistant","content":"你好！"},{"id":"msg-3","role":"user","content":"创建一个关于光合作用的课程"}],"tools":[],"context":[],"forwardedProps":{}}'
```

**Expected output:** SSE stream with `RUN_STARTED`, `TEXT_MESSAGE_CONTENT`, `RUN_FINISHED` events.

**Yes, agents work independently** - you can have normal multi-turn conversations via curl without the frontend.
