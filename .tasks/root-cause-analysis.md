## Chat Not Working - Root Cause Found

### The Problem
CopilotKit frontend (v1.52.1) `LangGraphHttpAgent` is sending messages in a format that doesn't match what the backend AG-UI protocol expects.

### What the Frontend Sends
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What happens when ice melts?"
    }
  ]
}
```

### What the Backend Expects (AG-UI Protocol)
```json
{
  "messages": [
    {
      "id": "msg-123",
      "role": "user",
      "content": [{"type": "text", "text": "What happens when ice melts?"}]
    }
  ]
}
```

### Evidence
1. ✅ Backend works perfectly when given correct format (tested with Python script)
2. ✅ Backend streams response: "That's a fantastic question to start with! Let's see what happens in the simulation..."
3. ❌ Frontend `LangGraphHttpAgent` doesn't add message `id` field
4. ❌ Frontend sends `content` as string, not array of content objects
5. ❌ Backend rejects with 422: `Field required` for `messages[0]["user"]["id"]`

### Solution Options
1. **Update CopilotKit** - Check if newer version has AG-UI compatibility
2. **Add middleware** - Transform messages between frontend and backend
3. **Use different integration** - Switch from AG-UI to native LangGraph HTTP
4. **Patch backend** - Make AG-UI accept CopilotKit format (not recommended)

### Recommended Fix
Add a FastAPI middleware to transform CopilotKit messages to AG-UI format before they reach the agent endpoint.
