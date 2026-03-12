#!/usr/bin/env python3
"""
Minimal test to invoke the graph directly without AG-UI wrapper.
"""
import asyncio
from agent.graphs.chat import build_chat_graph
from agent.topics.changing_states.config import changing_states_config

async def test_direct_invocation():
    print("[TEST] Building chat graph...")
    graph = build_chat_graph(changing_states_config)

    print("[TEST] Graph compiled successfully")
    print(f"[TEST] Nodes: {list(graph.nodes.keys())}")

    # Test input
    input_data = {
        "messages": [{"role": "user", "content": "hello"}],
        "simulation": {"phase": "solid", "temperature": 0},
        "companion": {},
        "events": {}
    }

    print(f"[TEST] Invoking graph with input: {input_data}")

    # Config with thread_id (required by checkpointer)
    config = {"configurable": {"thread_id": "test-thread-1"}}

    try:
        # Use astream to see if events are yielded
        print("[TEST] Starting astream with config...")
        async for event in graph.astream(input_data, config):
            print(f"[TEST] Event: {event}")

        print("[TEST] ✓ Graph executed successfully!")
        return True

    except Exception as e:
        print(f"[TEST] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_direct_invocation())
    exit(0 if success else 1)
