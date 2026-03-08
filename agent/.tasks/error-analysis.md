# 422 Error Analysis: CopilotKit Integration

## Error Details

**Status:** 422 Unprocessable Entity
**Endpoint:** `POST /agents/chat-changing-states`
**Date:** 2026-03-03

## Exact Validation Error

```json
{
  "error": "Validation Error",
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "threadId"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    },
    {
      "type": "missing",
      "loc": ["body", "runId"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    },
    {
      "type": "missing",
      "loc": ["body", "state"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    },
    {
      "type": "missing",
      "loc": ["body", "messages", 0, "user", "id"],
      "msg": "Field required",
      "input": {"role": "user", "content": "Hello"}
    },
    {
      "type": "missing",
      "loc": ["body", "tools"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    },
    {
      "type": "missing",
      "loc": ["body", "context"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    },
    {
      "type": "missing",
      "loc": ["body", "forwardedProps"],
      "msg": "Field required",
      "input": {"messages": [{"role": "user", "content": "Hello"}]}
    }
  ]
}
```

## Expected Message Format (Backend)

The backend uses `ag_ui_langgraph` which expects the **AG-UI Protocol** format via `RunAgentInput`:

```python
class RunAgentInput(ConfiguredBaseModel):
    """Input for running an agent."""
    thread_id: str              # Required: conversation thread identifier
    run_id: str                 # Required: unique run identifier
    parent_run_id: Optional[str] = None
    state: Any                  # Required: agent state (can be empty dict)
    messages: List[Message]     # Required: list of Message objects
    tools: List[Tool]           # Required: available tools (can be empty list)
    context: List[Context]      # Required: additional context (can be empty list)
    forwarded_props: Any        # Required: forwarded properties (can be empty dict)
```

### Message Structure

Each message must be a proper `Message` object with:

```python
class UserMessage(BaseMessage):
    id: str                     # Required: unique message ID
    role: Literal["user"]       # Required: must be "user"
    content: Union[str, List[InputContent]]  # Required: message content
    name: Optional[str] = None
    encrypted_value: Optional[str] = None
```

## Received Message Format (Frontend)

The frontend sent a simplified format:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ]
}
```

**Missing fields:**
- `threadId` - no thread identifier
- `runId` - no run identifier
- `state` - no agent state
- `messages[0].id` - message missing unique ID
- `tools` - no tools array
- `context` - no context array
- `forwardedProps` - no forwarded properties

## Root Cause Analysis

### Primary Issue: Protocol Mismatch

The frontend (`@copilotkit/react-core` 1.52.1 with `LangGraphHttpAgent`) is sending messages in a different format than what the backend (`copilotkit` 0.1.78 with `add_langgraph_fastapi_endpoint`) expects.

### Why This Happens

1. **Backend uses AG-UI Protocol**: The `add_langgraph_fastapi_endpoint` function creates a FastAPI endpoint that expects `RunAgentInput` from the AG-UI protocol (defined in `ag_ui.core.types`).

2. **Frontend sends simplified format**: The `LangGraphHttpAgent` from `@copilotkit/runtime/langgraph` appears to be sending a simplified message format that doesn't include all required AG-UI protocol fields.

3. **Version incompatibility**: There's likely a version mismatch between:
   - Frontend: `@copilotkit/react-core` 1.52.1
   - Backend: `copilotkit` 0.1.78
   - The AG-UI protocol implementation

### Endpoint Registration

The backend registers agents using:

```python
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="chat-changing-states",
        description="Answers questions about states of matter for ages 6-8",
        graph=chat_graph,
    ),
    path="/agents/chat-changing-states",
)
```

This creates a POST endpoint at `/agents/chat-changing-states` that expects the full `RunAgentInput` schema.

## Solutions

### Option 1: Update Frontend to Send Full AG-UI Protocol

Modify the frontend to send complete `RunAgentInput` payloads including:
- Generate `threadId` and `runId`
- Add `id` to each message
- Include empty arrays for `tools` and `context`
- Include `state` and `forwardedProps`

### Option 2: Update Backend Package Versions

Ensure backend `copilotkit` version matches the protocol expected by frontend `@copilotkit/runtime/langgraph`.

### Option 3: Add Middleware to Transform Requests

Create middleware in the backend to transform simplified frontend requests into full AG-UI protocol format before validation.

### Option 4: Use Different Backend Integration

Instead of `add_langgraph_fastapi_endpoint`, use a different CopilotKit integration method that matches the frontend's message format.

## Next Steps

1. Check if there's a version of `copilotkit` backend that matches `@copilotkit/react-core` 1.52.1
2. Review CopilotKit documentation for proper LangGraph integration
3. Consider if the frontend should use a different agent adapter
4. Test with aligned package versions on both sides
