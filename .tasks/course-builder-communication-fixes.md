# Course Builder Communication Fixes

## Issues Identified

### 1. Tool Status Lifecycle Incomplete
**Problem:** Backend emitted `_active_tools` with executing status but never updated to complete status before clearing.

**Fix:**
- `tool_executor` now emits tools with `status: "complete"` after execution
- `chat_node` clears `_active_tools` only on final response (no more tool calls)

### 2. Message Duplication
**Problem:** Frontend `renderMessages()` could process the same message multiple times if `visibleMessages` array was mutated.

**Fix:** Added `processedIds` Set to track and skip already-rendered messages.

### 3. Tool Status Detection Too Narrow
**Problem:** Frontend only checked `status === "complete"`, missing other completion states.

**Fix:** Now checks `status === "complete" || status === "success"` and `status === "executing" || status === "in_progress"`.

### 4. Excessive Logging
**Problem:** Backend logged all messages on every turn, flooding logs in long conversations.

**Fix:** Only log last 3 messages for debugging.

## Testing Checklist

- [ ] Start a new course builder conversation
- [ ] Send a message that triggers tool calls (e.g., "创建一个关于水的三态变化的实验")
- [ ] Verify tool indicators show "executing" state with animation
- [ ] Verify tool indicators transition to "complete" state (no animation)
- [ ] Verify no duplicate messages appear in chat
- [ ] Verify agent's final response appears after all tools complete
- [ ] Check backend logs for clean tool lifecycle: executing → complete → cleared

## Known Remaining Issues

### ToolMessage Content Leak (CopilotKit Bug)
**Status:** Confirmed bug in CopilotKit 1.52.1
**Workaround:** Backend sets `ToolMessage(content="")` and uses `emit_messages=False`
**Impact:** Minimal - empty content doesn't leak visible text
**Reference:** `code-failures/bugs/copilotkit-copilotkit-tool-result-text-leaks-chat-v2.md`

## Files Changed

- `agent/graphs/course_builder.py` - Tool status lifecycle, state emission timing
- `components/teacher/CourseBuilder.tsx` - Duplicate prevention, status detection
