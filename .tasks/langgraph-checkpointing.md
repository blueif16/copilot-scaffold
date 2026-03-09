# LangGraph PostgreSQL Checkpointing Cheatsheet

**Date:** 2026-03-08
**Purpose:** Migration guide from `MemorySaver()` to `PostgresSaver` for persistent conversation storage in the course builder agent.

---

## Overview

LangGraph checkpointing enables persistent conversation memory by saving graph state to a database. This allows:
- Conversation continuity across sessions
- State recovery after server restarts
- Multi-turn conversations with context retention
- Time-travel debugging (replay from specific checkpoints)

**Current state:** Course builder uses `MemorySaver()` (in-memory only, lost on restart)
**Target state:** `PostgresSaver` (persistent, production-ready)

---

## PostgresSaver vs MemorySaver

| Feature | MemorySaver | PostgresSaver |
|---------|-------------|---------------|
| **Persistence** | In-memory only | Database-backed |
| **Survives restart** | No | Yes |
| **Production-ready** | No | Yes |
| **Setup required** | None | `checkpointer.setup()` |
| **Dependencies** | Built-in | `langgraph-checkpoint-postgres`, `psycopg[binary,pool]` |
| **Thread isolation** | Yes | Yes |
| **Performance** | Fast | Slightly slower (network I/O) |

---

## Installation

### Python Dependencies

Add to `agent/pyproject.toml`:

```toml
dependencies = [
    "langgraph>=0.2.0",
    "langgraph-checkpoint-postgres>=0.0.1",
    "psycopg[binary,pool]>=3.0.0",
]
```

Install:
```bash
cd agent
uv pip install langgraph-checkpoint-postgres psycopg[binary,pool]
```

---

## Database Schema

### Required Tables

PostgresSaver automatically creates these tables when you call `checkpointer.setup()`:

1. **checkpoints** — Stores graph state snapshots
   - `thread_id` (text) — Primary key for conversation threads
   - `checkpoint_id` (uuid) — Unique checkpoint identifier
   - `parent_checkpoint_id` (uuid) — Previous checkpoint (for history)
   - `checkpoint` (jsonb) — Serialized graph state
   - `metadata` (jsonb) — Custom metadata
   - `created_at` (timestamptz) — Checkpoint timestamp

2. **checkpoint_writes** — Stores pending writes (for interrupts/human-in-the-loop)
   - `thread_id` (text)
   - `checkpoint_id` (uuid)
   - `task_id` (text)
   - `idx` (int)
   - `channel` (text)
   - `value` (bytea)

### Schema Initialization

**First-time setup only:**

```python
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = "postgresql://user:password@host:port/database"
checkpointer = PostgresSaver.from_conn_string(DB_URI)
checkpointer.setup()  # Creates tables if they don't exist
```

**Important:** Only call `setup()` once during initial deployment. Subsequent runs should skip this step.

---

## PostgresSaver Initialization

### Synchronous Version

```python
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"

# Context manager (recommended)
with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
    graph = builder.compile(checkpointer=checkpointer)
    # Use graph...

# Manual lifecycle
checkpointer = PostgresSaver.from_conn_string(DB_URI)
try:
    graph = builder.compile(checkpointer=checkpointer)
    # Use graph...
finally:
    checkpointer.close()
```

### Asynchronous Version

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable"

# Context manager (recommended)
async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
    graph = builder.compile(checkpointer=checkpointer)
    # Use graph...

# Manual lifecycle
checkpointer = await AsyncPostgresSaver.from_conn_string(DB_URI)
try:
    graph = builder.compile(checkpointer=checkpointer)
    # Use graph...
finally:
    await checkpointer.aclose()
```

### Connection String Format

```
postgresql://[user[:password]@][host][:port][/database][?param1=value1&...]
```

**Examples:**
```python
# Local development
"postgresql://postgres:postgres@localhost:5432/omniscience"

# Docker Compose (from backend container)
"postgresql://postgres:postgres@supabase-db:5432/postgres"

# Self-hosted Supabase (via Kong gateway)
"postgresql://postgres:postgres@localhost:5432/postgres"

# SSL required
"postgresql://user:pass@host:5432/db?sslmode=require"

# Connection pooling
"postgresql://user:pass@host:5432/db?pool_size=20&max_overflow=10"
```

### Environment Variable Pattern

```python
import os
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = os.getenv(
    "POSTGRES_URI",
    "postgresql://postgres:postgres@localhost:5432/omniscience"
)

checkpointer = PostgresSaver.from_conn_string(DB_URI)
```

---

## Migration: MemorySaver → PostgresSaver

### Before (In-Memory)

```python
from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver

def build_course_builder_graph():
    builder = StateGraph(CourseBuilderState)
    builder.add_node("generate", generate_course)
    builder.add_edge(START, "generate")

    # In-memory checkpointer (lost on restart)
    graph = builder.compile(checkpointer=MemorySaver())
    return graph
```

### After (PostgreSQL)

```python
from langgraph.graph import StateGraph
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
import os

async def build_course_builder_graph():
    builder = StateGraph(CourseBuilderState)
    builder.add_node("generate", generate_course)
    builder.add_edge(START, "generate")

    # PostgreSQL checkpointer (persistent)
    DB_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@supabase-db:5432/postgres")
    checkpointer = await AsyncPostgresSaver.from_conn_string(DB_URI)

    graph = builder.compile(checkpointer=checkpointer)
    return graph
```

### Migration Checklist

- [ ] Add `langgraph-checkpoint-postgres` and `psycopg[binary,pool]` to dependencies
- [ ] Add `POSTGRES_URI` environment variable
- [ ] Run `checkpointer.setup()` once to create tables
- [ ] Replace `MemorySaver()` with `PostgresSaver.from_conn_string(DB_URI)`
- [ ] Update graph builder to use async if needed
- [ ] Test thread_id persistence across restarts
- [ ] Verify checkpoint retrieval with `graph.get_state(config)`

---

## Thread ID Management

### What is a Thread ID?

A `thread_id` is the primary key for conversation persistence. It:
- Uniquely identifies a conversation session
- Must be provided in every graph invocation
- Enables state recovery across multiple turns
- Allows multiple concurrent conversations (different thread_ids)

### Thread ID Generation

**Frontend (CopilotKit):**
```typescript
import { CopilotKit } from "@copilotkit/react-core";
import { v4 as uuidv4 } from "uuid";

// Generate once per session
const [threadId] = useState(() => uuidv4());

<CopilotKit
  runtimeUrl="/api/copilotkit"
  agent="course-builder-agent"
  threadId={threadId}  // Persists conversation
>
  <CourseBuilder />
</CopilotKit>
```

**Backend (LangGraph):**
```python
# Thread ID comes from RunAgentInput.threadId (AG-UI protocol)
# CopilotKit automatically passes it in config["configurable"]["thread_id"]

async def generate_course(state: CourseBuilderState, config: RunnableConfig):
    thread_id = config["configurable"]["thread_id"]
    print(f"[course-builder] Processing thread: {thread_id}")
    # ... generate course
```

### Thread ID Best Practices

1. **Generate on frontend:** Let CopilotKit manage thread_id lifecycle
2. **UUID format:** Use UUID v4 for uniqueness (`crypto.randomUUID()` or `uuid.uuid4()`)
3. **Store in session:** Keep thread_id in React state or session storage
4. **One thread per conversation:** Don't reuse thread_ids across different conversations
5. **User-scoped threads:** Optionally prefix with user_id: `{user_id}:{uuid}`

### Thread ID Patterns

**New conversation (fresh thread):**
```typescript
const [threadId] = useState(() => crypto.randomUUID());
```

**Resume conversation (existing thread):**
```typescript
// Load from database or session storage
const [threadId] = useState(() => {
  const saved = sessionStorage.getItem("course_builder_thread");
  return saved || crypto.randomUUID();
});

useEffect(() => {
  sessionStorage.setItem("course_builder_thread", threadId);
}, [threadId]);
```

**User-scoped threads:**
```typescript
const threadId = `${userId}:course-builder:${crypto.randomUUID()}`;
```

---

## Conversation Recovery

### Retrieve Latest State

```python
from langgraph.graph import RunnableConfig

# Get the most recent checkpoint for a thread
config = {"configurable": {"thread_id": "abc-123"}}
state_snapshot = graph.get_state(config)

print(state_snapshot.values)       # Current state
print(state_snapshot.next)          # Next nodes to execute
print(state_snapshot.metadata)      # Checkpoint metadata
print(state_snapshot.created_at)    # Timestamp
```

### Retrieve Specific Checkpoint

```python
# Get a specific checkpoint by ID
config = {
    "configurable": {
        "thread_id": "abc-123",
        "checkpoint_id": "1ef663ba-28fe-6528-8002-5a559208592c"
    }
}
state_snapshot = graph.get_state(config)
```

### List Checkpoint History

```python
# Get all checkpoints for a thread (newest first)
config = {"configurable": {"thread_id": "abc-123"}}
history = list(graph.get_state_history(config))

for snapshot in history:
    print(f"Checkpoint: {snapshot.config['configurable']['checkpoint_id']}")
    print(f"Created: {snapshot.created_at}")
    print(f"Next: {snapshot.next}")
    print(f"State: {snapshot.values}")
    print("---")
```

### Resume from Checkpoint

```python
# Continue execution from a specific checkpoint
config = {
    "configurable": {
        "thread_id": "abc-123",
        "checkpoint_id": "0c62ca34-ac19-445d-bbb0-5b4984975b2a"
    }
}

# LangGraph replays steps before checkpoint, re-executes steps after
result = graph.invoke(None, config=config)
```

---

## Integration with CopilotKit

### Frontend Setup

```typescript
// app/api/copilotkit/route.ts
import { CopilotRuntime } from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

const runtime = new CopilotRuntime({
  agents: {
    "course-builder-agent": new LangGraphHttpAgent({
      url: `${process.env.BACKEND_URL}/agents/course-builder`,
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return await handleRequest(req);
};
```

```typescript
// components/teacher/CourseBuilder.tsx
import { CopilotKit } from "@copilotkit/react-core";
import { useCopilotChatInternal } from "@copilotkit/react-core";

export function CourseBuilder() {
  const [threadId] = useState(() => crypto.randomUUID());

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="course-builder-agent"
      threadId={threadId}  // Enables persistence
    >
      <CourseBuilderUI />
    </CopilotKit>
  );
}

function CourseBuilderUI() {
  const { messages, sendMessage, isLoading } = useCopilotChatInternal();

  const handleSend = async (content: string) => {
    await sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      content,
    });
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input onSubmit={handleSend} />
    </div>
  );
}
```

### Backend Setup

```python
# agent/graphs/course_builder.py
from copilotkit import CopilotKitState
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
import os

class CourseBuilderState(CopilotKitState):
    template: str | None = None
    files: dict[str, str] = {}

async def generate_course(state: CourseBuilderState, config: RunnableConfig):
    thread_id = config["configurable"]["thread_id"]
    print(f"[course-builder] Thread: {thread_id}")

    # Generate course content...
    return {"files": generated_files}

async def build_course_builder_graph():
    builder = StateGraph(CourseBuilderState)
    builder.add_node("generate", generate_course)
    builder.add_edge(START, "generate")
    builder.add_edge("generate", END)

    # PostgreSQL checkpointer
    DB_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@supabase-db:5432/postgres")
    checkpointer = await AsyncPostgresSaver.from_conn_string(DB_URI)

    return builder.compile(checkpointer=checkpointer)
```

```python
# agent/main.py
from fastapi import FastAPI
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from agent.graphs.course_builder import build_course_builder_graph

app = FastAPI()

@app.on_event("startup")
async def startup():
    course_builder_graph = await build_course_builder_graph()

    add_langgraph_fastapi_endpoint(
        app=app,
        agent=LangGraphAGUIAgent(
            name="course-builder-agent",
            description="Generates interactive science courses",
            graph=course_builder_graph,
        ),
        path="/agents/course-builder",
    )
```

### Thread ID Flow

```
1. Frontend generates threadId (UUID)
   ↓
2. CopilotKit passes threadId in RunAgentInput
   ↓
3. Backend receives threadId in config["configurable"]["thread_id"]
   ↓
4. PostgresSaver loads checkpoint for threadId
   ↓
5. Graph executes with restored state
   ↓
6. PostgresSaver saves new checkpoint with same threadId
   ↓
7. Next invocation with same threadId resumes from checkpoint
```

---

## Connection Pooling

### Default Pool Configuration

`psycopg` automatically manages connection pooling. Default settings:

```python
# Implicit pool configuration
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@host:5432/db"
)
# Default: min_size=1, max_size=10
```

### Custom Pool Configuration

```python
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver

# Create custom pool
pool = ConnectionPool(
    conninfo="postgresql://user:pass@host:5432/db",
    min_size=5,      # Minimum connections
    max_size=20,     # Maximum connections
    timeout=30.0,    # Connection timeout (seconds)
)

# Use pool with checkpointer
checkpointer = PostgresSaver(pool)
```

### Production Pool Settings

```python
import os
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DB_URI = os.getenv("POSTGRES_URI")

pool = ConnectionPool(
    conninfo=DB_URI,
    min_size=10,          # Keep 10 connections warm
    max_size=50,          # Scale up to 50 under load
    timeout=30.0,         # 30s connection timeout
    max_idle=300.0,       # Close idle connections after 5min
    max_lifetime=3600.0,  # Recycle connections after 1hr
)

checkpointer = await AsyncPostgresSaver(pool)
```

---

## Encryption (Optional)

### Enable Encrypted Checkpoints

```python
from langgraph.checkpoint.serde.encrypted import EncryptedSerializer
from langgraph.checkpoint.postgres import PostgresSaver
import os

# Set encryption key (32-byte AES key)
os.environ["LANGGRAPH_AES_KEY"] = "your-32-byte-base64-encoded-key"

# Create encrypted serializer
serde = EncryptedSerializer.from_pycryptodome_aes()

# Use with checkpointer
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@host:5432/db",
    serde=serde
)
checkpointer.setup()
```

### Generate AES Key

```bash
# Generate 32-byte AES key
python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Add to `.env`:
```
LANGGRAPH_AES_KEY=your-generated-key-here
```

---

## Best Practices

### 1. Connection Management

✅ **Do:**
- Use context managers (`with` / `async with`) for automatic cleanup
- Set appropriate pool sizes based on expected load
- Use environment variables for connection strings
- Enable SSL in production (`sslmode=require`)

❌ **Don't:**
- Hardcode credentials in source code
- Create new checkpointer instances per request
- Leave connections open indefinitely
- Use `sslmode=disable` in production

### 2. Thread ID Management

✅ **Do:**
- Generate thread_id on frontend (CopilotKit handles this)
- Use UUID v4 format for uniqueness
- Store thread_id in session storage for recovery
- Log thread_id for debugging

❌ **Don't:**
- Reuse thread_ids across different conversations
- Use sequential integers (not unique enough)
- Generate thread_id on backend (breaks CopilotKit flow)
- Expose thread_ids in URLs (security risk)

### 3. Schema Management

✅ **Do:**
- Call `checkpointer.setup()` once during deployment
- Use database migrations for schema changes
- Test schema initialization in staging first
- Document required tables in README

❌ **Don't:**
- Call `setup()` on every request (performance hit)
- Manually modify checkpoint tables
- Drop tables without backup
- Mix MemorySaver and PostgresSaver in same deployment

### 4. Error Handling

✅ **Do:**
```python
try:
    async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
        graph = builder.compile(checkpointer=checkpointer)
        result = await graph.ainvoke(input, config)
except Exception as e:
    print(f"[course-builder] Checkpoint error: {e}")
    # Fallback to MemorySaver or return error
```

❌ **Don't:**
- Ignore connection errors silently
- Let exceptions propagate to frontend
- Retry indefinitely without backoff

### 5. Performance Optimization

✅ **Do:**
- Use connection pooling (default is good)
- Index `thread_id` column (auto-created by `setup()`)
- Clean up old checkpoints periodically
- Monitor database query performance

❌ **Don't:**
- Fetch entire checkpoint history on every request
- Store large binary data in state (use external storage)
- Run `get_state_history()` without limits

---

## Troubleshooting

### Connection Refused

**Symptom:** `psycopg.OperationalError: connection refused`

**Causes:**
- PostgreSQL not running
- Wrong host/port in connection string
- Firewall blocking connection
- Docker network misconfiguration

**Fix:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql "postgresql://postgres:postgres@localhost:5432/postgres"

# Check Docker network
docker network inspect omniscience_default
```

### Tables Not Found

**Symptom:** `relation "checkpoints" does not exist`

**Cause:** `checkpointer.setup()` not called

**Fix:**
```python
checkpointer = PostgresSaver.from_conn_string(DB_URI)
checkpointer.setup()  # Run once
```

### Thread ID Not Persisting

**Symptom:** Each request starts fresh conversation

**Causes:**
- thread_id not passed in config
- Different thread_id on each request
- Checkpointer not configured

**Fix:**
```python
# Verify thread_id in config
config = {"configurable": {"thread_id": "abc-123"}}
result = graph.invoke(input, config)

# Check CopilotKit threadId prop
<CopilotKit threadId={threadId}>
```

### Slow Checkpoint Writes

**Symptom:** Graph execution slow, database CPU high

**Causes:**
- Large state objects
- No connection pooling
- Missing indexes
- Network latency

**Fix:**
```python
# Reduce state size
class CourseBuilderState(CopilotKitState):
    files: dict[str, str] = {}  # Store file URLs, not content

# Increase pool size
pool = ConnectionPool(conninfo=DB_URI, min_size=10, max_size=50)

# Use async for better concurrency
async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
    ...
```

---

## Testing

### Unit Test: Checkpoint Persistence

```python
import pytest
from langgraph.checkpoint.postgres import PostgresSaver
from agent.graphs.course_builder import build_course_builder_graph

@pytest.mark.asyncio
async def test_checkpoint_persistence():
    DB_URI = "postgresql://postgres:postgres@localhost:5432/test_db"

    async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
        await checkpointer.setup()

        graph = await build_course_builder_graph()

        # First invocation
        config = {"configurable": {"thread_id": "test-123"}}
        result1 = await graph.ainvoke(
            {"messages": [{"role": "user", "content": "Create a water cycle lab"}]},
            config
        )

        # Second invocation (should resume)
        result2 = await graph.ainvoke(
            {"messages": [{"role": "user", "content": "Add a quiz section"}]},
            config
        )

        # Verify state persisted
        state = await graph.aget_state(config)
        assert len(state.values["messages"]) == 4  # 2 user + 2 assistant
```

### Integration Test: End-to-End

```bash
# Start services
docker-compose up -d

# Run test
curl -X POST http://localhost:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-456",
    "runId": "run-1",
    "state": {},
    "messages": [{"id": "msg-1", "role": "user", "content": "Create a solar system lab"}],
    "tools": [],
    "context": [],
    "forwardedProps": {}
  }'

# Verify checkpoint saved
psql "postgresql://postgres:postgres@localhost:5432/postgres" \
  -c "SELECT thread_id, created_at FROM checkpoints WHERE thread_id = 'test-456';"
```

---

## Migration Timeline

### Phase 1: Setup (Day 1)
- [ ] Add dependencies to `pyproject.toml`
- [ ] Add `POSTGRES_URI` to `.env` and `.env.local.dev`
- [ ] Run `checkpointer.setup()` in staging
- [ ] Verify tables created

### Phase 2: Code Changes (Day 1-2)
- [ ] Update `build_course_builder_graph()` to use `AsyncPostgresSaver`
- [ ] Add error handling for connection failures
- [ ] Update tests to use PostgreSQL
- [ ] Test locally with Docker Compose

### Phase 3: Deployment (Day 2)
- [ ] Deploy to staging
- [ ] Test thread persistence across restarts
- [ ] Monitor database performance
- [ ] Deploy to production

### Phase 4: Validation (Day 3)
- [ ] Verify conversations persist after backend restart
- [ ] Check checkpoint history retrieval
- [ ] Monitor database size growth
- [ ] Set up checkpoint cleanup job (optional)

---

## References

- [LangGraph Persistence Docs](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Add Memory Guide](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [PostgresSaver API Reference](https://docs.langchain.com/oss/python/langgraph/checkpoint-postgres)
- [psycopg Connection Pool](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
- [CopilotKit AG-UI Protocol](https://docs.copilotkit.ai/reference/ag-ui-protocol)

---

## Quick Reference

### Import Statements

```python
# Sync
from langgraph.checkpoint.postgres import PostgresSaver

# Async
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Encryption
from langgraph.checkpoint.serde.encrypted import EncryptedSerializer

# Connection pooling
from psycopg_pool import ConnectionPool
```

### Common Commands

```python
# Initialize checkpointer
checkpointer = PostgresSaver.from_conn_string(DB_URI)
await checkpointer.setup()  # First time only

# Compile graph
graph = builder.compile(checkpointer=checkpointer)

# Invoke with thread_id
config = {"configurable": {"thread_id": "abc-123"}}
result = await graph.ainvoke(input, config)

# Get state
state = await graph.aget_state(config)

# Get history
history = list(await graph.aget_state_history(config))
```

### Environment Variables

```bash
# .env
POSTGRES_URI=postgresql://postgres:postgres@supabase-db:5432/postgres
LANGGRAPH_AES_KEY=your-32-byte-base64-key  # Optional, for encryption
```
