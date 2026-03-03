# ═══════════════════════════════════════════════════════════
# Chat Graph Tests
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from graphs.chat import build_chat_graph
from topics.changing_states.config import changing_states_config


def test_chat_graph_compiles():
    """Chat graph builds and compiles without error."""
    graph = build_chat_graph(changing_states_config)
    assert graph is not None


def test_chat_graph_has_respond_node():
    """Chat graph contains the expected respond node."""
    graph = build_chat_graph(changing_states_config)
    graph_data = graph.get_graph()
    node_ids = [n.id for n in graph_data.nodes]
    assert "respond" in node_ids


@pytest.mark.asyncio
async def test_chat_graph_generates_response():
    """Chat graph invocation returns an assistant message (mocked LLM)."""
    from langchain_core.messages import AIMessage, HumanMessage

    mock_response = AIMessage(content="Ice is water as a solid!")

    # Patch the lazy import inside the conversational_response node
    with patch(
        "langchain_google_genai.ChatGoogleGenerativeAI",
    ) as mock_cls:
        mock_instance = mock_cls.return_value
        mock_instance.ainvoke = AsyncMock(return_value=mock_response)

        graph = build_chat_graph(changing_states_config)

        input_state = {
            "messages": [HumanMessage(content="What is ice?")],
            "simulation": {"temperature": 20, "phase": "solid"},
            "companion": {
                "progress": {},
                "reactionHistory": [],
            },
            "copilotkit": {"actions": [], "context": []},
        }

        result = await graph.ainvoke(input_state)

        assert "messages" in result
        assert len(result["messages"]) >= 1
