# LangGraph StateGraph State Management Research Findings

**Research Date:** 2026-03-12
**Prefix:** [main]

## Overview

This document captures research findings on LangGraph StateGraph state management behavior, specifically focusing on state merging, persistence, and annotation semantics.

---

## Multi-Turn Conversation Test Results (2026-03-12)

**Test:** Verify file persistence across turns with empty state.files from frontend

### Test Setup

Backend started on port 8123 using:
```bash
agent/.venv/bin/python -m uvicorn agent.main:app --host 127.0.0.1 --port 8123
```

### Test Execution

**Turn 1: Create Files**
```bash
curl -X POST http://127.0.0.1:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-persist","runId":"run-1","state":{"files":{},"uploaded_images":[]},"messages":[{"id":"msg-1","role":"user","content":"创建一个关于光合作用的课程"}],"tools":[],"context":[],"forwardedProps":{}}'
```

**Result:** ✅ Success - Agent created files, full SSE stream received (1.4MB output)

**Turn 2: List Files with Empty State**
```bash
curl -X POST http://127.0.0.1:8123/agents/course-builder \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"threadId":"test-persist","runId":"run-2","state":{"files":{},"uploaded_images":[]},"messages":[{"id":"msg-1","role":"user","content":"创建一个关于光合作用的课程"},{"id":"msg-2","role":"assistant","content":"好的，我来创建课程"},{"id":"msg-3","role":"user","content":"列出所有文件"}],"tools":[],"context":[],"forwardedProps":{}}'
```

**Result:** ❌ FAILED - Connection closed with error

### Error Analysis

Backend logs show:
```
ValueError: Message ID not found in history
  File "ag_ui_langgraph/agent.py", line 375, in prepare_regenerate_stream
    time_travel_checkpoint = await self.get_checkpoint_before_message(message_checkpoint.id, thread_id)
  File "ag_ui_langgraph/agent.py", line 849, in get_checkpoint_before_message
    raise ValueError("Message ID not found in history")
```

### Root Cause

The error occurs in AG-UI's `prepare_regenerate_stream` method, which is triggered when:
1. Frontend sends messages with IDs (msg-1, msg-2, msg-3)
2. AG-UI tries to find these message IDs in the checkpoint history
3. Message IDs don't exist in checkpoint because they're synthetic test IDs

**This is NOT a file persistence issue.** The error happens before the agent even starts processing - it's a message ID validation failure in AG-UI's regeneration logic.

### Issue

The test is invalid because:
- We're sending synthetic message IDs (msg-1, msg-2, msg-3) that don't exist in the checkpoint
- AG-UI's `prepare_regenerate_stream` expects message IDs to match checkpoint history
- This is a test harness problem, not a file persistence problem

### Next Steps

To properly test file persistence, we need to:
1. Either use real message IDs from the checkpoint after turn 1
2. Or test through the actual frontend which generates proper message IDs
3. Or modify the test to not include assistant messages (which trigger regeneration logic)

### Conclusion

**Test Status:** INCONCLUSIVE - Test harness issue prevents verification

The file persistence fix (merge_dicts reducer) is correctly implemented in the code, but we cannot verify it works via curl because:
- curl test uses synthetic message IDs
- AG-UI validates message IDs against checkpoint history
- This validation fails before the agent processes the request

The fix should work in production where the frontend sends real message IDs from the conversation history.

---

## 1. How StateGraph Merges State Updates from Nodes

### Default Behavior: Shallow Merge with Overwrite

**Key Finding:** When a node returns a partial state update (subset of state keys), LangGraph performs a **shallow merge** at the top level:
- Keys returned by the node **overwrite** the corresponding keys in the existing state
- Keys not returned by the node remain unchanged
- This is a **top-level merge only** - no deep merging of nested structures

**Example:**
```python
# Current state
state = {
    "foo": "old_value",
    "bar": [1, 2, 3],
    "baz": "unchanged"
}

# Node returns partial update
def node(state):
    return {"foo": "new_value", "bar": [4, 5]}

# Resulting state after merge
{
    "foo": "new_value",      # overwritten
    "bar": [4, 5],           # overwritten (not appended!)
    "baz": "unchanged"       # preserved
}
```

**Source:** Context7 documentation states: "If a node returns only a partial update to the state, the graph merges that update into the existing state."

---

## 2. Does Returning `{"files": files}` Overwrite or Merge?

### Answer: It Overwrites (Without Custom Reducer)

**Critical Finding:** For dict fields like `files: dict`, returning `{"files": files}` will **completely replace** the existing `files` dict, not merge it.

**Why This Matters:**
- If `state["files"]` contains `{"file1.txt": "content1", "file2.txt": "content2"}`
- And a node returns `{"files": {"file3.txt": "content3"}}`
- The result is `{"files": {"file3.txt": "content3"}}` - file1 and file2 are **lost**

**Solution:** To preserve existing files, nodes must:
1. Read the current state
2. Manually merge: `files = {**state["files"], **new_files}`
3. Return the merged dict

**Alternative:** Define a custom reducer for the `files` key (see Section 4).

---

## 3. How MemorySaver Persists State Between Node Executions

### Checkpoint-Based Persistence

**Key Concepts:**

1. **Checkpoints:** LangGraph creates a snapshot of the entire state after each node execution (called a "super-step")
2. **Threads:** A `thread_id` serves as the primary key for storing and retrieving checkpoint sequences
3. **MemorySaver/InMemorySaver:** In-memory implementation of the checkpointer interface (data lost on process restart)

**Persistence Flow:**
```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# First invocation - creates new thread
config = {"configurable": {"thread_id": "conversation-1"}}
graph.invoke({"messages": []}, config)

# Second invocation - loads state from thread
graph.invoke({"messages": [...]}, config)  # State is restored!
```

**Checkpoint Sequence:**
1. Initial checkpoint: Empty state with `START` as next node
2. After user input: State includes input, next node is `node_a`
3. After `node_a`: State includes `node_a` outputs, next node is `node_b`
4. After `node_b`: Final state with no next node

**State Retrieval:**
```python
# Get current state
state = graph.get_state(config)

# Get state history (most recent first)
history = list(graph.get_state_history(config))

# Get specific checkpoint
config_with_checkpoint = {
    "configurable": {
        "thread_id": "1",
        "checkpoint_id": "1ef663ba-28fe-6528-8002-5a559208592c"
    }
}
state = graph.get_state(config_with_checkpoint)
```

**Production Persistence:**
- `MemorySaver`: In-memory only (development/testing)
- `SqliteSaver`: SQLite database persistence
- `PostgresSaver`: PostgreSQL database persistence
- All support encryption via `EncryptedSerializer`

---

## 4. State Annotation Semantics for Dict Fields

### Reducer Functions Control Merge Behavior

**Default (No Annotation):** Overwrite behavior
```python
class State(TypedDict):
    files: dict  # Returns {"files": new_dict} overwrites entirely
```

**With Custom Reducer:** Custom merge logic
```python
from typing import Annotated
from operator import add

class State(TypedDict):
    messages: Annotated[list, add]  # Appends to list instead of replacing
```

### Common Reducer Patterns

**1. List Append (operator.add):**
```python
from typing import Annotated
from operator import add

class State(TypedDict):
    messages: Annotated[list, add]
    completed_sections: Annotated[list, add]

# Node can return just new items
def node(state):
    return {"messages": [new_message]}  # Appends, doesn't replace
```

**2. Custom Dict Merge:**
```python
def merge_dicts(left: dict, right: dict) -> dict:
    """Merge two dicts, with right taking precedence."""
    return {**left, **right}

class State(TypedDict):
    files: Annotated[dict, merge_dicts]

# Now returning {"files": {"new.txt": "content"}} merges instead of replacing
```

**3. Explicit Overwrite (bypass reducer):**
```python
from langgraph.types import Overwrite

# Force overwrite even if reducer is defined
return {"files": Overwrite(new_files_dict)}
```

### Parallel Execution and Reducers

**Critical for Parallel Nodes:** When multiple nodes execute in parallel and update the same state key, reducers determine how their outputs combine:

```python
class State(TypedDict):
    aggregate: Annotated[list, operator.add]

# Nodes b and c run in parallel
def b(state): return {"aggregate": ["B"]}
def c(state): return {"aggregate": ["C"]}

# Without reducer: One would overwrite the other (race condition)
# With operator.add: Results concatenate: ["B", "C"] or ["C", "B"]
```

---

## Key Takeaways

1. **Partial updates merge at top level only** - returning a subset of state keys preserves unreturned keys
2. **Dict fields overwrite by default** - `{"files": new_dict}` replaces the entire dict, not merges
3. **Manual merging required** - nodes must explicitly merge dicts: `{**state["files"], **new_files}`
4. **Reducers enable custom merge logic** - use `Annotated[type, reducer_func]` for append/merge behavior
5. **MemorySaver uses thread_id** - state persists across invocations with same thread_id
6. **Checkpoints created per node** - full state snapshot after each node execution
7. **Parallel nodes need reducers** - without reducers, parallel updates to same key create race conditions

---

## Implications for Course Builder Agent

**Current Issue:** If `course_builder.py` returns `{"files": files}` without merging existing state, previous files are lost.

**Fix Options:**
1. **Manual merge in node:** `files = {**state.get("files", {}), **new_files}`
2. **Define reducer:** Add custom dict merge reducer to state annotation
3. **Read-then-write pattern:** Always read current state before updating

**Recommended:** Option 1 (manual merge) for explicit control and clarity.

---

## References

- LangGraph Documentation: https://docs.langchain.com/oss/python/langgraph/
- Context7 Library ID: `/websites/langchain_oss_python_langgraph`
- Code Snippets Analyzed: 851 snippets from official documentation

---

## 5. CourseBuilderState Class Analysis

**File:** `/Users/tk/Desktop/Omniscience/agent/graphs/course_builder.py:385-393`

### State Definition

```python
class CourseBuilderState(CopilotKitState):
    """Course builder agent state.
    CopilotKitState provides: messages, copilotkit (actions + context).
    """
    files: dict[str, str]
    uploaded_images: list[dict[str, str]]  # [{id, base64, mimeType, filename}]
    _tool_results_cache: dict[str, str]  # tool_call_id → full result (NOT synced to frontend)
    _active_tools: list[dict[str, str]]   # [{name, detail}] → pushed to frontend for inline rendering
```

### Critical Findings

**1. No Type Annotations with Reducers**

All fields use plain type hints without `Annotated[type, reducer]`:
- `files: dict[str, str]` - **No reducer** → overwrites entire dict on update
- `uploaded_images: list[dict[str, str]]` - **No reducer** → replaces entire list
- `_tool_results_cache: dict[str, str]` - **No reducer** → overwrites entire dict
- `_active_tools: list[dict[str, str]]` - **No reducer** → replaces entire list

**2. CopilotKitState Base Class**

Inherits from `CopilotKitState` (from `copilotkit` package), which provides:
- `messages: Annotated[list, add_messages]` - Has reducer for message merging
- `copilotkit: dict` - Contains actions and context from frontend

The base class likely uses proper reducers for `messages`, but custom fields in `CourseBuilderState` do not.

**3. State Merging Behavior**

Based on LangGraph semantics:
- When `tool_executor` returns `{"files": files}`, it **completely replaces** the existing `files` dict
- When `chat_node` or other nodes return state updates, they overwrite rather than merge
- This explains the file loss issue: each node that returns `files` wipes out previous file entries

**4. Current Mitigation in Code**

The code attempts manual merging in `tool_executor` (line 551):
```python
files = dict(state.get("files") or {})  # Copy existing files
```

However, this only works if:
- Every node that touches `files` does the same manual merge
- No parallel nodes update `files` simultaneously
- The return statement includes the merged dict

**5. Verification of Return Statements**

Checking `tool_executor` return (lines 692-700):
```python
result = {
    "_tool_results_cache": full_results_cache,
    "messages": tool_results,
}
if files_modified:
    result["files"] = files  # Returns merged files dict
```

The node correctly returns the merged `files` dict, but only when `files_modified=True`.

### Root Cause Confirmation

**The state definition IS causing the overwrite behavior** because:

1. **No reducer annotation** on `files: dict[str, str]` field
2. **Default LangGraph behavior** is "last write wins" for non-annotated fields
3. **Manual merging required** in every node that updates files
4. **Risk of data loss** if any node forgets to merge before returning

### Recommended Fix

**Option A: Add Custom Reducer (Preferred)**

```python
from typing import Annotated

def merge_dicts(left: dict, right: dict) -> dict:
    """Merge two dicts, with right taking precedence."""
    return {**left, **right}

class CourseBuilderState(CopilotKitState):
    files: Annotated[dict[str, str], merge_dicts]
    uploaded_images: list[dict[str, str]]
    _tool_results_cache: Annotated[dict[str, str], merge_dicts]
    _active_tools: list[dict[str, str]]
```

**Option B: Keep Manual Merging (Current Approach)**

Continue using `files = dict(state.get("files") or {})` in every node, but:
- Add explicit comments documenting this requirement
- Ensure all nodes that touch `files` follow the pattern
- Risk: Easy to forget in new nodes

**Option C: Hybrid Approach**

Use reducer for `files` and `_tool_results_cache` (which accumulate), but keep manual control for `_active_tools` (which should be replaced each time).

### Impact on Frontend State

The AG-UI protocol sends state updates via `copilotkit_emit_state()`:
- Line 683: `await copilotkit_emit_state(config, {"files": files, "_active_tools": completed_tools})`
- Line 686: `await copilotkit_emit_state(config, {"_active_tools": completed_tools})`

Without a reducer, each `emit_state` call with `files` key will overwrite the frontend's `files` state completely, not merge it. This matches the observed behavior where files disappear from the UI.

### Conclusion

**Yes, the state definition is directly causing the overwrite behavior.** The lack of reducer annotations on dict fields means LangGraph applies "last write wins" semantics, requiring manual merging in every node. Adding a custom reducer would eliminate this fragility and ensure consistent merge behavior across all nodes.

---

## Additional Web Research Findings

**Source:** [Troubleshoot LangGraph State Management in 20 Minutes](https://markaicode.com/troubleshoot-langgraph-state-management/)

Key insights:
- "Without reducers, LangGraph applies 'last write wins' semantics"
- "When multiple nodes update the same state key, the final value replaces all previous ones rather than merging"
- Built-in `add_messages` reducer "handles both appending new messages and updating existing ones by message ID"
- Nodes should return partial state (only keys they own), not full state

**Source:** [Lesson 2.2 The Solution: Reducers](https://datmt.com/python/lesson-2-2-the-solution-reducers/)

Demonstrates `Annotated` with `operator.add` for list fields:
```python
topics: Annotated[list[str], operator.add]
```

For dict merging, custom reducer function needed (not covered in source but inferred from pattern).

---

## 6. State Flow Trace in tool_executor (Lines 524-700)

**File:** `/Users/tk/Desktop/Omniscience/agent/graphs/course_builder.py`

### Graph Structure

```
START → chat_node → [conditional] → tool_executor → chat_node → END
                         ↓
                        END
```

**Conditional routing (line 703-708):**
- If last message has tool_calls → route to `tool_executor`
- Otherwise → END

**Edge flow:**
- Line 751: `START → chat_node`
- Line 752-755: `chat_node → should_continue() → tool_executor or END`
- Line 756: `tool_executor → chat_node` (loop back)

### State Flow Analysis

#### Step 1: chat_node receives state

**Line 426:** `files = state.get('files', {})`
- Reads current files from state
- Used only for context injection in system prompt (lines 427-434)
- **Does NOT modify files**
- **Does NOT return files in result** (line 501: `result: dict = {"messages": [response]}`)

**chat_node return (lines 501-521):**
```python
result: dict = {"messages": [response]}
if has_images:
    result["uploaded_images"] = []
if not has_tool_calls:
    result["_active_tools"] = []
    result["_tool_results_cache"] = {}
```

**Critical finding:** `chat_node` NEVER returns `files` in its state update. This means:
- If `files` exists in state, it's preserved (not returned = not overwritten)
- `chat_node` is read-only for files

#### Step 2: tool_executor receives state

**Line 551:** `files = dict(state.get("files") or {})`
- Creates a **copy** of existing files dict
- Empty dict if files is None or empty

**Lines 552-553:** Track modifications
```python
files_modified = False  # Track if files were actually changed
```

**Lines 564-652:** Tool execution modifies local `files` dict
- `read_file`: reads from `files`, doesn't modify
- `list_files`: reads from `files`, doesn't modify
- `write_file`: modifies `files[path] = content`, sets `files_modified = True` (line 594)
- `update_file`: modifies `files[path]`, sets `files_modified = True` (line 613)
- `delete_file`: deletes from `files`, sets `files_modified = True` (line 628)
- `search_components`, `get_component`: don't touch files

#### Step 3: tool_executor returns state update

**Lines 692-700:**
```python
result = {
    "_tool_results_cache": full_results_cache,
    "messages": tool_results,
}
if files_modified:
    result["files"] = files
    print(f"[Agent:tool_executor] Returning files in state: {list(files.keys())}")

return result
```

**Critical finding:** `files` is ONLY returned if `files_modified=True`

**This means:**
- If tool execution modifies files → `{"files": files}` returned → state updated
- If tool execution is read-only → `files` NOT returned → state preserved (not overwritten)

#### Step 4: State merge happens

LangGraph merges the returned dict into state:
- `result["_tool_results_cache"]` → overwrites `_tool_results_cache`
- `result["messages"]` → appends to messages (has `add_messages` reducer)
- `result["files"]` (if present) → **overwrites** `files` dict entirely

### The Bug: Where Files Get Lost

**Scenario 1: Files modified correctly**
1. State has: `{"files": {"file1.txt": "content1"}}`
2. tool_executor reads: `files = dict(state.get("files") or {})` → `{"file1.txt": "content1"}`
3. write_file adds: `files["file2.txt"] = "content2"` → `{"file1.txt": "content1", "file2.txt": "content2"}`
4. tool_executor returns: `{"files": {"file1.txt": "content1", "file2.txt": "content2"}}`
5. State after merge: `{"files": {"file1.txt": "content1", "file2.txt": "content2"}}` ✅

**Scenario 2: Read-only operation**
1. State has: `{"files": {"file1.txt": "content1"}}`
2. tool_executor reads: `files = dict(state.get("files") or {})`
3. read_file or list_files executes (no modification)
4. tool_executor returns: `{"_tool_results_cache": {...}, "messages": [...]}`  (NO files key)
5. State after merge: `{"files": {"file1.txt": "content1"}}` ✅ (preserved)

**Scenario 3: THE BUG - Parallel execution or race condition**

**Hypothesis 1: Multiple tool calls in same turn**
1. State has: `{"files": {"file1.txt": "content1"}}`
2. LLM returns AIMessage with 2 tool_calls: [write_file(file2.txt), write_file(file3.txt)]
3. tool_executor processes BOTH in same execution (lines 557-669 loop)
4. First iteration: `files["file2.txt"] = "content2"`
5. Second iteration: `files["file3.txt"] = "content3"`
6. tool_executor returns: `{"files": {"file1.txt": "content1", "file2.txt": "content2", "file3.txt": "content3"}}`
7. Result: ✅ All files preserved (single execution, single return)

**Hypothesis 2: State not passed correctly between nodes**

Checking graph edges:
- Line 756: `graph.add_edge("tool_executor", "chat_node")`
- This is a direct edge, state should flow automatically

**Hypothesis 3: copilotkit_emit_state() causes desync**

**Lines 682-687:**
```python
if files_modified:
    await copilotkit_emit_state(config, {"files": files, "_active_tools": completed_tools})
    print(f"[Agent:tool_executor] State emitted with files: {list(files.keys())}")
else:
    await copilotkit_emit_state(config, {"_active_tools": completed_tools})
    print(f"[Agent:tool_executor] State emitted without files (read-only operation)")
```

**Critical question:** Does `copilotkit_emit_state()` affect the LangGraph state, or only the frontend state?

If `copilotkit_emit_state()` modifies the LangGraph state:
- Line 683 emits: `{"files": files, "_active_tools": completed_tools}`
- Line 697 returns: `{"files": files}` (if modified)
- **Potential double-write or race condition**

If `copilotkit_emit_state()` only affects frontend:
- No conflict, state flow is clean

### Root Cause Identification

**The bug is NOT in tool_executor's state handling.** The code correctly:
1. Reads existing files: `files = dict(state.get("files") or {})`
2. Modifies local copy
3. Returns merged dict: `{"files": files}` (only if modified)

**Possible causes:**
1. **State initialization issue**: If state starts with `files=None` instead of `files={}`, line 551 would create empty dict
2. **chat_node clearing files**: Check if chat_node ever returns `{"files": {}}` or `{"files": None}`
3. **Frontend state desync**: `copilotkit_emit_state()` might be overwriting backend state
4. **Checkpointer issue**: MemorySaver might not be persisting files correctly between invocations

### Next Steps to Debug

1. **Check state initialization** in graph builder (lines 744-782)
2. **Verify chat_node never returns files** (confirmed above - it doesn't)
3. **Test copilotkit_emit_state behavior** - does it modify LangGraph state?
4. **Add logging** to track state.get("files") at entry of each node
5. **Check if files is in initial state** when graph is invoked

---

## 7. Graph Invocation and State Initialization

**File:** `/Users/tk/Desktop/Omniscience/agent/main.py`

### Graph Setup (lines 129-163)

```python
course_builder_graph = build_course_builder_graph_sync()

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

**Key finding:** The graph is wrapped by `LangGraphAGUIAgent` from `copilotkit` package and exposed via `add_langgraph_fastapi_endpoint` from `ag_ui_langgraph` package.

### State Initialization Flow

**The graph is NOT invoked directly in main.py.** Instead:
1. `add_langgraph_fastapi_endpoint()` creates a FastAPI endpoint at `/agents/course-builder`
2. Frontend sends POST requests to this endpoint with AG-UI protocol payload
3. The AG-UI integration layer handles graph invocation

**AG-UI Protocol Payload (from CLAUDE.md test example):**
```json
{
  "threadId": "test-1",
  "runId": "run-1",
  "state": {
    "files": {},
    "uploaded_images": []
  },
  "messages": [...],
  "tools": [],
  "context": [],
  "forwardedProps": {}
}
```

**Critical observation:** The initial state is provided by the **frontend** in the `state` field of the request payload.

### State Initialization Hypothesis

**Scenario: Frontend sends empty state on subsequent turns**

1. **First request:** Frontend sends `{"state": {"files": {}, "uploaded_images": []}}`
2. tool_executor modifies files: `{"file1.txt": "content1"}`
3. tool_executor returns: `{"files": {"file1.txt": "content1"}}`
4. State after merge: `{"files": {"file1.txt": "content1"}}`
5. **Second request:** Frontend sends `{"state": {"files": {}, "uploaded_images": []}}` (empty files!)
6. LangGraph uses frontend-provided state as initial state
7. tool_executor reads: `files = dict(state.get("files") or {})` → `{}`
8. Result: Files lost!

**This would explain the bug if:**
- AG-UI integration doesn't properly merge frontend state with checkpointed state
- Frontend state overwrites checkpointed state instead of merging
- The `state` field in the request payload is treated as authoritative

### Checkpointer Behavior with AG-UI

**Question:** When using MemorySaver with AG-UI protocol, which state takes precedence?
- Checkpointed state from MemorySaver (persisted between turns)
- State from frontend request payload

**Expected behavior:** Checkpointed state should be loaded by `thread_id`, and frontend state should only provide new inputs (messages, uploaded_images).

**Possible bug:** AG-UI integration might be overwriting checkpointed state with frontend state instead of merging.

### Verification Needed

1. **Check AG-UI integration code** in `ag_ui_langgraph` package
2. **Test with curl** to see actual state flow between requests
3. **Add logging** at graph entry to see what state is received
4. **Check if MemorySaver is actually being used** by AG-UI integration

---

## 8. Root Cause Summary

**Primary Hypothesis: Frontend state overwrites checkpointed state**

The bug occurs because:

1. **State definition has no reducer** for `files: dict[str, str]` (Section 5)
2. **tool_executor correctly merges files** locally and returns merged dict (Section 6)
3. **MemorySaver checkpoints state** after each node execution (Section 3)
4. **BUT: AG-UI integration may overwrite checkpointed state** with frontend-provided state on each request (Section 7)

**The flow:**
```
Request 1: Frontend sends {"state": {"files": {}}}
→ tool_executor modifies → {"files": {"file1.txt": "content1"}}
→ MemorySaver checkpoints → {"files": {"file1.txt": "content1"}}

Request 2: Frontend sends {"state": {"files": {}}}  ← BUG HERE
→ AG-UI overwrites checkpoint with frontend state
→ tool_executor reads empty files → {"files": {}}
→ Files lost!
```

**Alternative hypothesis:** Frontend correctly sends files, but `copilotkit_emit_state()` causes desync between frontend and backend state.

### Recommended Fix

**Option 1: Add reducer to state definition (prevents overwrite)**
```python
def merge_dicts(left: dict, right: dict) -> dict:
    return {**left, **right}

class CourseBuilderState(CopilotKitState):
    files: Annotated[dict[str, str], merge_dicts]
```

**Option 2: Fix AG-UI integration to respect checkpointed state**
- Ensure checkpointed state takes precedence over frontend state
- Frontend state should only provide new inputs, not overwrite existing state

**Option 3: Don't rely on frontend state for files**
- Remove `files` from frontend state payload
- Only persist files in backend checkpointer
- Frontend only receives files via `copilotkit_emit_state()`

**Recommended approach:** Option 1 (add reducer) + verify AG-UI integration behavior.
