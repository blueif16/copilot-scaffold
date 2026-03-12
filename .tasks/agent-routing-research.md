# Course Builder Agent Routing Issue — Root Cause Analysis

**Status:** CRITICAL BUG IDENTIFIED  
**Date:** 2026-03-12  
**Symptom:** SSE stream starts (200 OK) but backend agent's chat_node never executes (no logs)

---

## Executive Summary

The course-builder agent endpoint **IS registered** at `/agents/course-builder` (line 155-163 in main.py), but there's a **stale comment** at line 229 that says "Course Builder endpoint is registered in startup_event after graph initialization" — which is **outdated and misleading**.

The real issue is **NOT a routing problem**. The endpoint is correctly registered. The SSE stream starting but the agent not executing suggests one of these:

1. **Request format mismatch** — Frontend sends data that doesn't match `RunAgentInput` schema
2. **Graph initialization issue** — `build_course_builder_graph_sync()` may be failing silently
3. **Middleware interception** — `FixAGUIProtocolMiddleware` may be blocking or corrupting the request
4. **Agent state validation** — `CourseBuilderState` may have missing required fields

---

## Architecture Comparison

### Frontend Setup (app/api/copilotkit/route.ts)

All agents configured identically:
```typescript
agents: {
  "observation-changing-states": new LangGraphHttpAgent({
    url: `${backendUrl}/agents/observation-changing-states`,
  }),
  "chat-changing-states": new LangGraphHttpAgent({
    url: `${backendUrl}/agents/chat-changing-states`,
  }),
  "course-builder": new LangGraphHttpAgent({
    url: `${backendUrl}/agents/course-builder`,
  }),
}
```

✓ **No difference** — course-builder uses same `LangGraphHttpAgent` pattern as working agents.

### Backend Registration (agent/main.py)

**Working agents (observation-changing-states, chat-changing-states, etc.):**
```python
# Lines 167-185
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="observation-changing-states",
        description="...",
        graph=observation_graph_changing_states,
    ),
    path="/agents/observation-changing-states",
)
```

**Course-builder agent:**
```python
# Lines 155-163
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="course-builder",
        description="Helps teachers create interactive science lessons with JSX code generation",
        graph=course_builder_graph,
    ),
    path="/agents/course-builder",
)
```

✓ **Identical registration pattern** — no structural difference.

---

## Request Format Analysis

### AG-UI Protocol (RunAgentInput)

All agents expect:
```json
{
  "threadId": "uuid",
  "runId": "uuid",
  "state": {},
  "messages": [{"id": "uuid", "role": "user", "content": "..."}],
  "tools": [],
  "context": [],
  "forwardedProps": {}
}
```

### FixAGUIProtocolMiddleware (middleware/protocol.py)

Patches incoming requests to ensure all required fields:
- ✓ Adds missing `threadId`, `runId`, `state`, `tools`, `context`, `forwardedProps`
- ✓ Converts `context: {}` → `context: []`
- ✓ Adds `id` to messages missing it
- ✓ Extracts `user_id` from Authorization header

**Applies to:** All POST requests to `/agents/*` (line 42)

```python
if method != "POST" or "/agents/" not in path:
    await self.app(scope, receive, send)
    return
```

✓ **course-builder IS covered** by this middleware.

---

## Graph Initialization Comparison

### Working Agents (observation, chat)

Built at module load time:
```python
# Lines 91-100
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
    memory_fetcher=fetch_student_memory,
)

chat_graph_changing_states = build_chat_graph(
    changing_states_config,
    memory_fetcher=fetch_student_memory,
)
```

- Synchronous builders
- Called at module import time
- Graphs available immediately

### Course Builder

```python
# Lines 128-130
print("[INIT] Building course builder graph...")
course_builder_graph = build_course_builder_graph_sync()
print("[INIT] Course builder graph built successfully")
```

- Synchronous builder (changed from async in recent commit)
- Called at module import time
- Should be available immediately

**Difference:** Course builder uses `build_course_builder_graph_sync()` (added in commit HEAD), while observation/chat use `build_observation_graph()` / `build_chat_graph()`.

---

## State Schema Comparison

### ObservationAgentState (graphs/observation.py:41-50)

```python
class ObservationAgentState(CopilotKitState):
    simulation: dict[str, Any]
    events: dict[str, Any]
    companion: dict[str, Any]
    _pending_reaction: Optional[dict[str, Any]]
    _ai_hint: Optional[str]
    _event_counts: dict[str, int]
```

### ChatAgentState (graphs/chat.py:61-66)

```python
class ChatAgentState(CopilotKitState):
    simulation: dict[str, Any]
    companion: dict[str, Any]
    events: dict[str, Any]
```

### CourseBuilderState (graphs/course_builder.py:385-392)

```python
class CourseBuilderState(CopilotKitState):
    files: dict[str, str]
    uploaded_images: list[dict[str, str]]
    _tool_results_cache: dict[str, str] = {}
    _active_tools: list[dict[str, str]] = []
```

**Key Difference:** CourseBuilderState has **different field names** (`files`, `uploaded_images`) vs observation/chat agents (`simulation`, `events`, `companion`).

This is **intentional** — course-builder is a different type of agent (code generation, not simulation observation).

---

## Middleware Logging Analysis

### FixAGUIProtocolMiddleware Output (protocol.py:39-47)

```python
print(f"[FixAGUIProtocol] Intercepted {method} {path}")
if method != "POST" or "/agents/" not in path:
    print(f"[FixAGUIProtocol] Skipping (not POST to /agents/)")
    await self.app(scope, receive, send)
    return

print(f"[FixAGUIProtocol] Processing POST {path}")
```

**Expected logs for course-builder:**
```
[FixAGUIProtocol] Intercepted POST /agents/course-builder
[FixAGUIProtocol] Processing POST /agents/course-builder
[FixAGUIProtocol] Patched: threadId=..., N messages
```

**Action:** Check backend startup logs for these messages. If missing, middleware is not intercepting course-builder requests.

---

## Potential Root Causes (Ranked by Likelihood)

### 1. **CRITICAL: Stale Comment Causing Confusion** (Line 229)

```python
# Course Builder endpoint is registered in startup_event after graph initialization
```

This comment is **outdated**. The endpoint IS registered at module load time (lines 155-163), not in a startup event.

**Impact:** Developers may think the endpoint isn't registered, leading to incorrect debugging.

**Fix:** Remove or update the comment.

---

### 2. **Graph Initialization Silent Failure**

`build_course_builder_graph_sync()` (line 129) may be failing but the exception is caught or suppressed.

**Check:**
- Backend startup logs for `[INIT] Course builder graph built successfully` message
- If missing, graph build failed
- Look for exceptions in stderr

**Symptoms if true:**
- SSE stream starts (endpoint exists)
- No agent execution (graph is None or invalid)
- No error in response (ag-ui-langgraph may handle gracefully)

---

### 3. **CourseBuilderState Field Mismatch**

Frontend may be sending `state: { simulation: {...} }` (like other agents), but CourseBuilderState expects `state: { files: {...} }`.

**Check:**
- Frontend logs: what does `state` object contain when sending to course-builder?
- Backend logs in `chat_node`: print `state.keys()` to see what fields are present

**Symptoms if true:**
- Agent receives request but state is empty or malformed
- `chat_node` may fail silently if it expects `files` key

---

### 4. **Middleware Corruption of Request**

`FixAGUIProtocolMiddleware` may be incorrectly patching the request for course-builder specifically.

**Check:**
- Middleware logs: `[FixAGUIProtocol] Patched: ...` for course-builder requests
- Compare patched request body with working agents

**Symptoms if true:**
- Middleware logs show patching, but agent doesn't execute
- Request format is valid but agent state is corrupted

---

### 5. **Missing Async Context in Graph**

`build_course_builder_graph_sync()` may not properly handle async nodes (e.g., `chat_node` is async).

**Check:**
- Graph compilation: does `graph.compile()` succeed?
- Node execution: are async nodes properly awaited?

**Symptoms if true:**
- Graph compiles but nodes don't execute
- No error in logs (async exceptions may be swallowed)

---

## Request Format Comparison

### What LangGraphHttpAgent Sends

From `@ag-ui/client` (HttpAgent):
```typescript
const body = {
  threadId: string,
  runId: string,
  state: object,
  messages: Array<{ id, role, content }>,
  tools: Array,
  context: Array,
  forwardedProps: object,
};

fetch(url, {
  method: "POST",
  headers: { "Accept": "text/event-stream", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
```

### What add_langgraph_fastapi_endpoint Expects

From `ag-ui-langgraph`:
```python
@app.post(path)
async def endpoint(request: RunAgentInput):
    # RunAgentInput is Pydantic model with:
    # - threadId: str
    # - runId: str
    # - state: dict
    # - messages: list[Message]
    # - tools: list
    # - context: list
    # - forwardedProps: dict
    pass
```

✓ **Formats match** — no protocol mismatch.

---

## Specific Differences: course-builder vs observation-changing-states

| Aspect | observation-changing-states | course-builder |
|--------|-----|-----|
| **Frontend URL** | `/agents/observation-changing-states` | `/agents/course-builder` |
| **Backend path** | `/agents/observation-changing-states` | `/agents/course-builder` |
| **Graph builder** | `build_observation_graph()` | `build_course_builder_graph_sync()` |
| **State class** | `ObservationAgentState` | `CourseBuilderState` |
| **State fields** | `simulation`, `events`, `companion` | `files`, `uploaded_images` |
| **Main node** | `event_classifier` | `chat_node` |
| **Tool support** | No tools | 7 tools (read_file, write_file, etc.) |
| **Registration** | Lines 167-175 | Lines 155-163 |
| **Middleware** | ✓ Covered | ✓ Covered |

**No structural differences** that would prevent routing.

---

## Debugging Checklist

### Backend Startup

- [ ] Check logs for `[INIT] Building course builder graph...`
- [ ] Check logs for `[INIT] Course builder graph built successfully`
- [ ] Check logs for `[INIT] Registering course-builder agent at /agents/course-builder`
- [ ] Check logs for `[INIT] Course-builder agent registered successfully`
- [ ] If any missing, graph build or registration failed

### Request Interception

- [ ] Send POST to `/agents/course-builder` with valid RunAgentInput
- [ ] Check logs for `[FixAGUIProtocol] Intercepted POST /agents/course-builder`
- [ ] Check logs for `[FixAGUIProtocol] Processing POST /agents/course-builder`
- [ ] Check logs for `[FixAGUIProtocol] Patched: threadId=..., N messages`

### Agent Execution

- [ ] Check logs for `[Agent:chat_node] Received N messages`
- [ ] Check logs for `[Agent:chat_node] LLM invocation successful`
- [ ] If missing, agent node never executed

### SSE Stream

- [ ] Verify response headers include `content-type: text/event-stream`
- [ ] Verify first event is `{"type":"RUN_STARTED",...}`
- [ ] Verify events follow AG-UI protocol (TEXT_MESSAGE_*, RUN_FINISHED)

---

## Recommendations

### Immediate Actions

1. **Remove stale comment** (line 229) — it's misleading and causes confusion
2. **Add startup validation** — verify course_builder_graph is not None after initialization
3. **Add request logging** — log first 200 chars of incoming request body for course-builder
4. **Add agent execution logging** — verify chat_node is called

### Code Changes Needed

**In agent/main.py (after line 130):**
```python
# Validate graph was built successfully
if course_builder_graph is None:
    raise RuntimeError("[INIT] Failed to build course builder graph")
print(f"[INIT] Course builder graph validation passed")
```

**In agent/graphs/course_builder.py (in chat_node, line 402):**
```python
print(f"[Agent:chat_node] Received {len(state['messages'])} messages")
print(f"[Agent:chat_node] State keys: {list(state.keys())}")
print(f"[Agent:chat_node] Files in state: {list(state.get('files', {}).keys())}")
```

**In agent/middleware/protocol.py (after line 138):**
```python
if "/course-builder" in path:
    print(f"[FixAGUIProtocol] Course-builder request: {full_body[:300]}")
```

---

## Version Compatibility

From code_failures knowledge base:

**Frontend:** @copilotkit/runtime@1.52.1 (pulls @ag-ui/client@0.0.46, @ag-ui/langgraph@0.0.24)  
**Backend:** copilotkit==0.1.78, ag-ui-langgraph==0.0.25

These versions are **known working** for AG-UI protocol. No version mismatch.

---

## Conclusion

**The course-builder endpoint IS correctly registered and should be reachable.** The SSE stream starting but agent not executing suggests:

1. **Most likely:** Graph initialization failed silently, or chat_node is not being invoked
2. **Second:** Request format is valid but state fields don't match CourseBuilderState expectations
3. **Third:** Middleware is corrupting the request for course-builder specifically

**Next step:** Check backend startup logs for `[INIT]` messages and request logs for `[FixAGUIProtocol]` and `[Agent:chat_node]` messages. If chat_node logs are missing, the agent is not executing despite the endpoint being registered.
