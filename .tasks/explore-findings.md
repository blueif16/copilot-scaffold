# LangGraph StateGraph State Management Research Findings

**Research Date:** 2026-03-12
**Prefix:** [main]

## Overview

This document captures research findings on LangGraph StateGraph state management behavior, specifically focusing on state merging, persistence, and annotation semantics.

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
