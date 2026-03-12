# Agent Hang Issue - RESOLVED

**Date:** 2026-03-12
**Status:** ✅ FIXED
**Commit:** 58f2e36

## Summary

All agents (chat, observation, course-builder) were hanging on requests. SSE stream would start (200 OK) but no events were yielded. The issue affected ALL agents, not just course-builder.

## Root Cause

**FixAGUIProtocolMiddleware had an infinite loop in `patched_receive()`:**

```python
# BROKEN CODE:
async def patched_receive() -> dict:
    nonlocal body_complete

    if body_complete:
        # This returns empty messages FOREVER, causing hang
        return {"type": "http.request", "body": b"", "more_body": False}
```

When the ASGI app called `receive()` multiple times after the body was sent, the middleware kept returning empty messages indefinitely, blocking the connection.

## Solution

Added a `patched_body_sent` flag to track if the patched body was already sent, then pass through to the original `receive()`:

```python
# FIXED CODE:
async def patched_receive() -> dict:
    nonlocal body_complete, patched_body_sent

    if body_complete:
        if patched_body_sent:
            # Pass through to original receive() for proper connection closure
            return await receive()
        patched_body_sent = True
        return {"type": "http.request", "body": b"", "more_body": False}
```

## Additional Fixes

1. **Removed mutable defaults from CourseBuilderState:**
   - Changed `_tool_results_cache: dict[str, str] = {}` → `_tool_results_cache: dict[str, str]`
   - Changed `_active_tools: list[dict[str, str]] = []` → `_active_tools: list[dict[str, str]]`
   - Mutable defaults violate Python best practices and can cause state issues

2. **Added missing `sys` import in main.py**

## Verification

Both agents now work correctly:

```bash
# Chat agent - WORKS ✅
curl -X POST http://127.0.0.1:8123/agents/chat-changing-states \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-1","runId":"run-1","state":{},"messages":[{"id":"msg-1","role":"user","content":"hello"}],"tools":[],"context":[],"forwardedProps":{}}'

# Course-builder agent - WORKS ✅
curl -X POST http://127.0.0.1:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-2","runId":"run-2","state":{"files":{},"uploaded_images":[]},"messages":[{"id":"msg-2","role":"user","content":"创建一个关于水循环的课程"}],"tools":[],"context":[],"forwardedProps":{}}'
```

Both return proper SSE streams with RUN_STARTED, TEXT_MESSAGE_*, and RUN_FINISHED events.

## Key Learnings

1. **The issue was NOT in the graph or AG-UI integration** - those were working correctly
2. **The middleware was blocking ALL requests** - even health endpoints hung on the broken backend
3. **ASGI middleware must properly handle the receive/send lifecycle** - returning empty messages indefinitely breaks the connection
4. **Testing without middleware confirmed the root cause** - agents worked perfectly when middleware was disabled

## Files Modified

- `agent/middleware/protocol.py` - Fixed infinite loop in patched_receive()
- `agent/graphs/course_builder.py` - Removed mutable defaults from CourseBuilderState
- `agent/main.py` - Added sys import

## Related Documents

- `.tasks/T1-graph-pattern-comparison.md` - Graph analysis (ruled out as cause)
- `.tasks/agent-debug-summary.md` - Initial debugging findings
- `.tasks/agent-routing-research.md` - Routing analysis (ruled out as cause)
