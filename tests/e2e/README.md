# Course Builder Testing Guide

## Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

## Logging Overview

The course builder now has comprehensive logging throughout the data flow cycle:

### Frontend Logs (Browser Console)

1. **[Frontend:handleSend]** - When user sends a message
   - Shows message content, phase, template selection

2. **[Frontend:useCoAgent]** - When agent state updates
   - Shows file count, file paths, total size

3. **[Frontend:phase]** - When UI phase transitions
   - Shows phase changes (landing → chat → split)

### API Route Logs (Server Console)

4. **[CopilotKit→Backend]** - Requests to backend
   - Shows request type (agent/run, emit_state)

5. **[Backend→CopilotKit]** - Responses from backend
   - Shows response status and content type

### Backend Agent Logs (Python Console)

6. **[Agent:chat_node]** - LLM processing
   - Shows message count, detected format, tool calls

7. **[Agent:tool_executor]** - File operations
   - Shows write_file/update_file operations with sizes
   - Shows state emission to frontend

## Test Suite

### test: should display landing page with format options
Verifies the initial landing page renders correctly with all format pills.

### test: should transition to chat phase when format selected
Tests format selection and transition to chat interface.

### test: should send message and receive response
Tests the message send flow and tracks frontend logging.

### test: should transition to split view when files are generated
Tests the complete flow from message → agent processing → file generation → split view rendering.

### test: should log complete data flow cycle
Comprehensive test that analyzes all logs to verify the complete data flow:
1. Frontend Send ✅
2. CopilotKit Request ✅
3. Agent Chat Node ✅
4. Agent Tool Executor ✅
5. CopilotKit Response ✅
6. Frontend State Update ✅
7. Phase Transition ✅

## Debugging Tips

1. **Check browser console** for frontend logs during test runs
2. **Check terminal** for backend agent logs (Python prints)
3. **Use `--debug` flag** to step through tests interactively
4. **Use `--ui` flag** for visual test runner with time travel debugging
5. **Screenshots** are automatically captured on test failures

## Expected Flow

```
User types message
  ↓
[Frontend:handleSend] logs message
  ↓
[CopilotKit→Backend] sends to agent
  ↓
[Agent:chat_node] processes with LLM
  ↓
[Agent:tool_executor] writes files + emits state
  ↓
[Backend→CopilotKit] returns response
  ↓
[Frontend:useCoAgent] receives state.files
  ↓
[Frontend:phase] transitions to split
  ↓
Sandpack renders preview
```
