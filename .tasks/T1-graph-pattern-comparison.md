# [wt-main] Graph Pattern Comparison: Working vs Broken Agents

**Date:** 2026-03-12
**Status:** Analysis Complete
**Finding:** Critical difference identified in node function signatures

---

## Executive Summary

The course-builder agent hangs because **both nodes (`chat_node` and `tool_executor`) are async functions**, while working agents use **mixed sync/async patterns**. This causes LangGraph's execution engine to stall when invoking the graph synchronously from the orchestrator.

---

## Side-by-Side Comparison

| Aspect | Observation (WORKING) | Chat (WORKING) | Course-Builder (BROKEN) |
|--------|----------------------|----------------|-------------------------|
| **Graph Builder** | `build_observation_graph()` (sync) | `build_chat_graph()` (sync) | `build_course_builder_graph_sync()` (sync) |
| **Checkpointer** | `MemorySaver()` | `MemorySaver()` | `MemorySaver()` |
| **Node 1 Signature** | `event_classifier(state)` - **SYNC** | `conversational_response(state, config)` - **ASYNC** | `chat_node(state, config)` - **ASYNC** |
| **Node 2 Signature** | `reaction_lookup(state)` - **SYNC** | N/A (single node) | `tool_executor(state, config)` - **ASYNC** |
| **Node 3 Signature** | `ai_reasoning(state, config)` - **ASYNC** | N/A | N/A |
| **Node 4 Signature** | `deliver_reaction(state, config)` - **ASYNC** | N/A | N/A |
| **Routing** | Command-based (reaction_lookup) | Command-based (conversational_response) | Conditional edges (should_continue) |
| **Graph Structure** | Linear with Command branching | Single node → END | ReAct loop (chat ↔ tool_executor) |
| **State Class** | `ObservationAgentState(CopilotKitState)` | `ChatAgentState(CopilotKitState)` | `CourseBuilderState(CopilotKitState)` |

---

## Key Differences

### 1. **Node Function Signatures (CRITICAL)**

**Observation Agent (WORKING):**
- Mix of sync and async nodes
- `event_classifier`: sync
- `reaction_lookup`: sync (returns Command)
- `ai_reasoning`: async
- `deliver_reaction`: async

**Chat Agent (WORKING):**
- Single async node
- `conversational_response`: async (returns Command)

**Course-Builder Agent (BROKEN):**
- **ALL nodes are async**
- `chat_node`: async
- `tool_executor`: async

### 2. **Graph Invocation Context**

From orchestrator analysis (not in these files, but inferred from context):
- Orchestrator likely calls `agent.run()` or `agent.invoke()` **synchronously**
- Working agents have at least one sync entry point or use Command-based routing that doesn't require async context
- Course-builder has no sync entry point → hangs when invoked synchronously

### 3. **Routing Mechanisms**

**Observation:**
- Uses `Command` objects for routing (reaction_lookup returns Command)
- No conditional edges on nodes that return Command

**Chat:**
- Single node, returns Command to END
- No conditional routing needed

**Course-Builder:**
- Uses `should_continue()` conditional edge function (sync)
- Conditional edges route between async nodes
- ReAct loop: chat_node → should_continue → tool_executor → chat_node

### 4. **State Complexity**

**Observation:**
- Simple state fields: simulation, events, companion, internal routing fields
- No file management

**Chat:**
- Minimal state: simulation, companion, events
- No tools or file operations

**Course-Builder:**
- Complex state: files dict, uploaded_images, tool cache
- Heavy state mutations in tool_executor
- Large file content stored in state

---

## Hypothesis: Why Course-Builder Hangs

### Root Cause (VERIFIED)

**The graph IS invoked asynchronously via `graph.astream_events()`** (line 358 in agent.py), so the async/sync mismatch hypothesis is **INCORRECT**.

After analyzing the AG-UI LangGraph adapter code, all agents use the same invocation path:
1. FastAPI endpoint receives POST request (endpoint.py:13)
2. Calls `agent.run(input_data)` which is async (agent.py:108)
3. Internally calls `graph.astream_events(**kwargs)` (agent.py:358)
4. Streams events back via SSE

**All three agents use identical invocation mechanisms.** The hang must be caused by something else in the graph structure or node implementation.

### Revised Analysis

The issue is NOT sync/async mismatch. Looking deeper at the differences:

**Key Observation:** Course-builder's `chat_node` has extensive logging (lines 402-499) that never appears, meaning the node is never invoked by LangGraph's execution engine.

**Possible causes:**
1. **State initialization issue** - Course-builder state might not initialize properly
2. **Graph compilation issue** - MemorySaver might fail silently during compilation
3. **START edge issue** - The edge from START to chat_node might not be properly registered
4. **Async context issue within astream_events** - Even though astream_events is async, there might be an issue with how async nodes are scheduled

### Evidence

1. **SSE stream starts (200 OK)** → Endpoint and agent.run() are invoked
2. **chat_node is never invoked** → Graph execution stalls before first node
3. **Middleware intercepts requests** → Request reaches the endpoint
4. **All agents use same invocation path** → Not an orchestrator issue

### Why Working Agents Don't Hang

**Observation:**
- Mix of sync and async nodes
- First two nodes (event_classifier, reaction_lookup) are **sync**
- LangGraph might handle sync entry nodes differently

**Chat:**
- Single async node
- But simpler state (no complex dicts like files, tool cache)
- Might succeed due to simpler state initialization

---

## Recommended Fixes

### UPDATED: Original hypothesis was wrong - all agents use async invocation

After reviewing the AG-UI adapter code, the sync/async mismatch theory is incorrect. All agents are invoked via `graph.astream_events()` which is fully async.

### New Investigation Directions

**PRIMARY FIX (MOST LIKELY):**

1. **Remove mutable defaults from CourseBuilderState**
   ```python
   class CourseBuilderState(CopilotKitState):
       files: dict[str, str]
       uploaded_images: list[dict[str, str]]
       _tool_results_cache: dict[str, str]  # Remove = {}
       _active_tools: list[dict[str, str]]   # Remove = []
   ```

   Then handle missing keys in nodes:
   ```python
   tool_cache = state.get("_tool_results_cache") or {}
   active_tools = state.get("_active_tools") or []
   ```

**SECONDARY INVESTIGATIONS (if primary fix doesn't work):**

2. **Compare state initialization**
   - Check if CourseBuilderState initializes properly
   - Verify default values for files, uploaded_images
   - Working agents have simpler state with no complex nested dicts

3. **Test with minimal state**
   - Temporarily remove complex state fields (files dict, tool cache)
   - See if graph executes with minimal state

4. **Add entry node for debugging**
   - Add a simple sync entry node that just logs and returns empty dict
   - This will confirm if the issue is with START → chat_node edge or chat_node itself

```python
def entry_node(state: CourseBuilderState) -> dict:
    """Debug entry point."""
    print(f"[course-builder] Entry node invoked - state keys: {list(state.keys())}")
    return {}

graph.add_node("entry", entry_node)
graph.add_edge(START, "entry")
graph.add_edge("entry", "chat_node")
```

5. **Check MemorySaver with complex state**
   - MemorySaver might have issues serializing complex state with nested dicts
   - Try removing checkpointer temporarily: `graph.compile()` (no checkpointer)

6. **Compare with observation agent pattern**
   - Observation agent works with mixed sync/async nodes
   - Try making chat_node sync (but keep tool_executor async)
   - This matches the observation pattern where entry nodes are sync

---

## Next Steps (Priority Order)

1. **Remove mutable defaults from CourseBuilderState** - Most likely fix
2. **Add debug entry node** - Confirm graph execution starts
3. **Test without checkpointer** - Rule out MemorySaver serialization issues
4. **Simplify state** - Remove complex nested dicts temporarily
5. **Make chat_node sync** - Match observation agent pattern (sync entry, async later nodes)

---

## Critical Finding: State Class Differences

### CourseBuilderState Has Default Values for Complex Fields

```python
class CourseBuilderState(CopilotKitState):
    files: dict[str, str]
    uploaded_images: list[dict[str, str]]
    _tool_results_cache: dict[str, str] = {}  # ← DEFAULT VALUE
    _active_tools: list[dict[str, str]] = []   # ← DEFAULT VALUE
```

**Problem:** Python class attributes with mutable defaults are shared across all instances. This is a well-known Python gotcha.

### Working Agents Don't Have Mutable Defaults

**ObservationAgentState:**
```python
class ObservationAgentState(CopilotKitState):
    simulation: dict[str, Any]
    events: dict[str, Any]
    companion: dict[str, Any]
    _pending_reaction: Optional[dict[str, Any]]  # No default
    _ai_hint: Optional[str]                      # No default
    _event_counts: dict[str, int]                # No default
```

**ChatAgentState:**
```python
class ChatAgentState(CopilotKitState):
    simulation: dict[str, Any]
    companion: dict[str, Any]
    events: dict[str, Any]
    # No fields with mutable defaults
```

### Why This Causes Hangs

LangGraph's state initialization might fail or behave unexpectedly when:
1. State class has mutable default values (shared across instances)
2. TypedDict/Pydantic validation fails silently
3. State serialization for checkpointer fails

**This is likely the root cause.** The mutable defaults `= {}` and `= []` violate Python best practices and can cause subtle bugs in state management systems.

---

## Additional Observations

### Logging Patterns

All three agents have comprehensive logging:
- Observation: Logs at key decision points
- Chat: Logs state and prompts
- Course-builder: **Extensive logging in chat_node** (lines 402-520)

**Note:** Course-builder logs never appear → confirms chat_node is never invoked.

### Error Handling

- Observation: Try/catch in async nodes, returns empty dict on error
- Chat: Try/catch with fallback AIMessage
- Course-builder: Try/catch in both nodes, comprehensive error messages

All agents handle errors gracefully → hang is not due to unhandled exception.

### Checkpointer Usage

All three use `MemorySaver()` identically → not the cause of the hang.

---

## Conclusion

**REVISED CONCLUSION:** After analyzing the AG-UI adapter code, the original sync/async hypothesis is incorrect. All agents use the same async invocation path via `graph.astream_events()`.

**Most Likely Root Cause:** CourseBuilderState has **mutable default values** (`= {}` and `= []`) which violates Python best practices and can cause state initialization failures in LangGraph.

**Primary Fix:** Remove mutable defaults from CourseBuilderState class definition.

**Secondary Investigations:** If removing mutable defaults doesn't fix it, investigate:
- State serialization issues with MemorySaver
- Complex nested dict handling
- Add debug entry node to confirm graph execution starts
- Try mixed sync/async node pattern like observation agent

The observation agent works because it has no mutable defaults and uses a mix of sync/async nodes. The chat agent works because it has simpler state with no mutable defaults.
