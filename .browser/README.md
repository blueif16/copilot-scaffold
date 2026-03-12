# Chat Flow Testing - One-Shot Guide

## Quick Test (agent-browser)

```bash
# 1. Login as teacher
agent-browser open http://localhost:3000/login
agent-browser click @e5  # Teacher button (fills demo-teacher@omniscience.app/demo123)
agent-browser click @e6  # Login button

# 2. Go to chat and select format
agent-browser open http://localhost:3000/teacher/chat/new
agent-browser click '[data-testid="format-lab"]'  # or format-quiz, format-dialogue

# 3. Send message
agent-browser fill '[data-testid="chat-message-input"]' "创建一个关于水循环的实验"
agent-browser click '[data-testid="chat-send-button"]'

# 4. Check logs
agent-browser console | grep -E "\[CopilotKit\]|\[Agent\]"
```

## Message Flow

```
User Input → CourseBuilder.tsx:handleSend()
  ↓
CopilotKit POST → /api/copilotkit (SSE)
  ↓
API bridge → http://localhost:8123/agents/course-builder
  ↓
agent/main.py → course_builder.py:chat_node()
  ↓
Response SSE stream back
```

## Log Correlation

Match by **threadId** (UUID in request body) and **timestamp**:
- Frontend: `[CopilotKit→Backend] timestamp threadId=abc-123`
- Backend: `[Agent:chat_node] Received N messages` (same second)

## Test Selectors (data-testid)

- `format-lab` / `format-quiz` / `format-dialogue` - Format buttons
- `chat-message-input` - Message input
- `chat-send-button` - Send button
- `upload-image-button` - Image upload

## Key Files

- Frontend: `components/teacher/CourseBuilder.tsx`
- API: `app/api/copilotkit/route.ts`
- Backend: `agent/graphs/course_builder.py`

## Demo Credentials

- Teacher: `demo-teacher@omniscience.app` / `demo123`
- Student: `demo-student@omniscience.app` / `demo123`
