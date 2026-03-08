# Chat Debug Plan

## Problem
Chat messages typed in the UI don't appear and no responses come back from the AI companion.

## Investigation Findings

### Frontend (✅ Configured Correctly)
- `useCopilotChat()` hook properly initialized in TopicRunner.tsx:78-82
- `appendMessage()` called with `TextMessage` in handleChatSend:316-320
- `visibleMessages` mapped to ChatOverlay component:296-314
- ChatOverlay UI renders input, send button, and message display
- CopilotKit provider configured with `agent="chat-changing-states"` and `runtimeUrl="/api/copilotkit"`

### Backend (✅ Running)
- Backend running on port 8123 (verified with lsof)
- Both agents registered: `/agents/observation-changing-states` and `/agents/chat-changing-states`
- Chat graph built with MemorySaver checkpointer
- conversational_response node returns messages correctly

### API Route (✅ Configured)
- `/app/api/copilotkit/route.ts` uses `LangGraphHttpAgent` pointing to backend
- Runtime configured with both agents
- POST handler uses `copilotRuntimeNextJSAppRouterEndpoint`

### Network (⚠️ Issue Found)
- Browser console shows: `http://localhost:3000/api/copilotkit` with status 0 (timeout after 3001ms)
- Direct curl test shows: `{"error":"invalid_request","message":"Missing method field"}`
- This suggests the CopilotKit protocol expects a specific request format

## Root Cause Hypothesis
The CopilotKit frontend is sending requests to `/api/copilotkit`, but the request format or protocol might be incompatible with how the backend agents are exposed via `add_langgraph_fastapi_endpoint`.

## Next Steps
1. Add console logging to see what requests are being sent
2. Check if there's a protocol mismatch between CopilotKit client and LangGraphHttpAgent
3. Verify the AG-UI protocol is correctly implemented
4. Test direct message flow from frontend to backend
