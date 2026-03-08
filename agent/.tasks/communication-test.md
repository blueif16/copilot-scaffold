# Chat Communication Test Results

**Date:** 2026-03-03
**Frontend:** http://localhost:3000
**Backend:** http://localhost:8123

---

## Service Status

### Frontend
- **Port:** 3000
- **Status:** Running (node process 64258)
- **Framework:** Next.js 14.2.29
- **CopilotKit Version:** @copilotkit/runtime@1.52.1

### Backend
- **Port:** 8123
- **Status:** Running (Python process 80183)
- **Framework:** FastAPI + LangGraph
- **CopilotKit Version:** copilotkit 0.1.78
- **Server:** uvicorn with --reload

---

## Error Analysis

### 422 Unprocessable Entity

When testing the backend endpoint directly with curl:

```bash
curl -X POST http://localhost:8123/agents/chat-changing-states \
  -H "Content-Type: application/json" \
  -d '{"message": "test message", "threadId": "test-thread-123"}'
```

**Response:**
```json
{
  "detail": [
    {"type": "missing", "loc": ["body", "runId"], "msg": "Field required"},
    {"type": "missing", "loc": ["body", "state"], "msg": "Field required"},
    {"type": "missing", "loc": ["body", "messages"], "msg": "Field required"},
    {"type": "missing", "loc": ["body", "tools"], "msg": "Field required"},
    {"type": "missing", "loc": ["body", "context"], "msg": "Field required"},
    {"type": "missing", "loc": ["body", "forwardedProps"], "msg": "Field required"}
  ]
}
```

### Expected Request Format

The backend expects the AG-UI protocol format from `add_langgraph_fastapi_endpoint`:

**Required fields:**
- `threadId` - Thread identifier for conversation
- `runId` - Run identifier for this execution
- `state` - Current graph state
- `messages` - Array of message objects with proper structure
- `tools` - Available tools array
- `context` - Context array
- `forwardedProps` - Forwarded properties object

**Message structure:**
Each message must have:
- `id` - Unique message identifier
- `role` - "user" or "assistant"
- `content` - Message text

---

## Message Flow

### Frontend → Backend Path

1. **User Input** → ChatOverlay component
   - File: `/Users/tk/Desktop/Omniscience/components/chat/ChatOverlay.tsx`
   - User types message and clicks "Ask"

2. **TopicRunner Handler** → useCopilotChat
   - File: `/Users/tk/Desktop/Omniscience/framework/TopicRunner.tsx`
   - `handleChatSend()` calls `appendMessage(new TextMessage({...}))`
   - Uses `@copilotkit/react-core` hooks

3. **CopilotKit Runtime** → API Route
   - Frontend sends to: `/api/copilotkit`
   - File: `/Users/tk/Desktop/Omniscience/app/api/copilotkit/route.ts`
   - Runtime configured with `LangGraphHttpAgent` for "chat-changing-states"

4. **API Route** → Backend Agent
   - Proxies to: `http://localhost:8123/agents/chat-changing-states`
   - Uses `copilotRuntimeNextJSAppRouterEndpoint`

5. **Backend Receives** → LangGraph Agent
   - File: `/Users/tk/Desktop/Omniscience/agent/main.py`
   - Registered via `add_langgraph_fastapi_endpoint`
   - Graph: `/Users/tk/Desktop/Omniscience/agent/graphs/chat.py`

### Backend State Structure

**ChatAgentState** (from `/Users/tk/Desktop/Omniscience/agent/graphs/chat.py`):
```python
class ChatAgentState(CopilotKitState):
    simulation: dict[str, Any]
    companion: dict[str, Any]
```

**CopilotKitState** includes:
- `messages` - List of AnyMessage objects
- `copilotkit` - CopilotKitProperties object

**CopilotKitProperties** includes:
- `actions` - List[Any]
- `context` - List[CopilotContextItem]
- `intercepted_tool_calls` - Any
- `original_ai_message_id` - Any

---

## Root Cause

The 422 error occurs because the frontend (CopilotKit 1.52.1) and backend (copilotkit 0.1.78) are using **incompatible protocol versions**.

The backend expects the full AG-UI protocol format with:
- `threadId`, `runId`, `state`, `tools`, `context`, `forwardedProps`

But the frontend is likely sending a different format through the CopilotKit runtime.

---

## Verification Steps Taken

1. ✅ Confirmed both services are running
2. ✅ Tested backend endpoint directly with curl
3. ✅ Identified missing required fields
4. ✅ Checked CopilotKit versions (frontend: 1.52.1, backend: 0.1.78)
5. ✅ Reviewed message flow from frontend to backend
6. ✅ Examined state structures and protocol expectations

---

## Next Steps

1. **Check version compatibility** - Verify if CopilotKit 1.52.1 (frontend) is compatible with 0.1.78 (backend)
2. **Update packages** - Consider upgrading backend to match frontend version
3. **Protocol alignment** - Ensure both sides use the same AG-UI protocol version
4. **Test with proper payload** - Once versions align, test with complete request structure

---

## Additional Notes

- Backend has extensive logging middleware in `main.py` that captures all requests
- Frontend has debug logging in `TopicRunner.tsx` and `route.ts`
- No log files found in `.logs/` directory (directory doesn't exist)
- Backend uses `MemorySaver` checkpointer for chat graph
- Frontend uses `useCopilotChat` hook which targets the agent specified in `<CopilotKit agent="...">`
