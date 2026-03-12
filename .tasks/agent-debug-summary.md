# Course Builder Agent Debug Summary

**Date:** 2026-03-12
**Issue:** Frontend receives SSE stream (200 OK) but backend agent never executes

## Root Cause

The course-builder agent endpoint is correctly registered at `/agents/course-builder`, but `LangGraphAGUIAgent.run()` hangs indefinitely when called. The middleware successfully intercepts requests, but the agent's `run()` method blocks and never yields events.

## What We Found

### ✅ Working
- Graph builds successfully: `build_course_builder_graph_sync()` completes without errors
- Endpoint registration: `add_langgraph_fastapi_endpoint()` registers the route correctly
- Middleware: `FixAGUIProtocolMiddleware` intercepts and patches requests
- Route exists: `POST /agents/course-builder` is in the FastAPI route table

### ❌ Not Working
- `agent.run(input_data)` hangs indefinitely
- No events are yielded from the async generator
- No `[Agent:chat_node]` logs appear (the node is never invoked)

## Investigation Steps Taken

1. ✅ Verified graph initialization completes
2. ✅ Verified endpoint is registered
3. ✅ Verified middleware intercepts requests
4. ✅ Confirmed requests reach the endpoint handler
5. ❌ **BLOCKED HERE**: `agent.run()` hangs

## Likely Causes

1. **Async/Sync mismatch**: `build_course_builder_graph_sync()` may not be compatible with AG-UI's async runtime
2. **Missing checkpointer initialization**: The graph uses `MemorySaver` but may need async initialization
3. **State schema mismatch**: `CourseBuilderState` fields may not match what AG-UI expects

## Next Steps

1. Test if the graph can be invoked directly (bypass AG-UI wrapper)
2. Compare course-builder graph initialization with working agents
3. Check if `MemorySaver` needs async setup for AG-UI
4. Add logging inside `chat_node` to see if it's ever called

## Files Modified During Debug

- `agent/main.py` - Added logging (needs cleanup)
- `agent/middleware/protocol.py` - Added verbose logging
- `agent/graphs/course_builder.py` - Added logging to chat_node

## Commands to Test

```bash
# Start backend
agent/.venv/bin/python -m uvicorn agent.main:app --host 0.0.0.0 --port 8123

# Test endpoint
curl -X POST http://localhost:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"hello","id":"msg-1"}],"threadId":"test","runId":"run","state":{},"tools":[],"context":[],"forwardedProps":{}}'
```

## Key Discovery

The middleware logs show:
```
[FixAGUIProtocol] HTTP request: POST /agents/course-builder
[FixAGUIProtocol] Processing POST /agents/course-builder - starting body collection
```

But then the request hangs with no further logs. This means the request reaches the FastAPI endpoint handler, but `agent.run()` blocks before yielding any events.
