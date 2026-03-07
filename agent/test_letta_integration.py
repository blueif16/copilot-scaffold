"""
Integration tests for Letta memory system.

Tests the complete Letta integration including:
- Client initialization
- Student agent creation
- Memory retrieval
- Memory updates
- Graph builder memory injection
"""

import os
from unittest.mock import MagicMock, patch, Mock

import pytest


# ── Test 1: Letta client initialization ──────────────────────


def test_letta_client_initialization():
    """Verify Letta client is created successfully with LETTA_BASE_URL."""
    from memory.letta_client import get_letta_client

    with patch.dict(os.environ, {"LETTA_BASE_URL": "http://localhost:8283"}):
        with patch("memory.letta_client.Letta") as mock_letta_cls:
            mock_client = MagicMock()
            mock_letta_cls.return_value = mock_client

            client = get_letta_client()

            mock_letta_cls.assert_called_once_with(base_url="http://localhost:8283")
            assert client == mock_client


def test_letta_client_missing_env_var():
    """Verify ValueError is raised when LETTA_BASE_URL is not set."""
    from memory.letta_client import get_letta_client

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="LETTA_BASE_URL environment variable is not set"):
            get_letta_client()


# ── Test 2: Create student agent ─────────────────────────────


def test_create_student_agent():
    """Verify student agent is created with 4 memory blocks."""
    from memory.letta_client import create_student_agent

    mock_agent = MagicMock()
    mock_agent.id = "agent-123"

    with patch.dict(os.environ, {"LETTA_BASE_URL": "http://localhost:8283"}):
        with patch("memory.letta_client.Letta") as mock_letta_cls:
            mock_client = MagicMock()
            mock_client.agents.create.return_value = mock_agent
            mock_letta_cls.return_value = mock_client

            agent_id = create_student_agent(
                student_id="test-123",
                name="Test Student",
                age=10
            )

            assert agent_id == "agent-123"
            mock_client.agents.create.assert_called_once()

            # Verify the call arguments
            call_args = mock_client.agents.create.call_args
            assert call_args.kwargs["name"] == "student-test-123"
            assert call_args.kwargs["model"] == "google/gemini-2.5-flash"
            assert call_args.kwargs["embedding"] == "openai/text-embedding-3-small"
            assert call_args.kwargs["enable_sleeptime"] is True

            # Verify 4 memory blocks are created
            memory_blocks = call_args.kwargs["memory_blocks"]
            assert len(memory_blocks) == 4

            labels = [block["label"] for block in memory_blocks]
            assert "student_profile" in labels
            assert "learning_style" in labels
            assert "knowledge_state" in labels
            assert "interests" in labels

            # Verify student_profile contains name and age
            profile_block = next(b for b in memory_blocks if b["label"] == "student_profile")
            assert "Test Student" in profile_block["value"]
            assert "10" in profile_block["value"]


# ── Test 3: Get student memory ───────────────────────────────


def test_get_student_memory():
    """Verify student memory retrieval returns dict with 4 keys."""
    from memory.letta_client import get_student_memory

    # Mock memory blocks
    mock_blocks = {
        "student_profile": Mock(value="Name: Test. Age: 10."),
        "learning_style": Mock(value="Visual learner, prefers hands-on."),
        "knowledge_state": Mock(value="Mastered: phase changes. Misconceptions: none."),
        "interests": Mock(value="Excited about ice and water."),
    }

    with patch.dict(os.environ, {"LETTA_BASE_URL": "http://localhost:8283"}):
        with patch("memory.letta_client.Letta") as mock_letta_cls:
            mock_client = MagicMock()
            mock_client.agents.blocks.retrieve.side_effect = lambda _agent_id, block_label: mock_blocks[block_label]
            mock_letta_cls.return_value = mock_client

            memory = get_student_memory(agent_id="agent-123")

            assert len(memory) == 4
            assert "student_profile" in memory
            assert "learning_style" in memory
            assert "knowledge_state" in memory
            assert "interests" in memory

            assert memory["student_profile"] == "Name: Test. Age: 10."
            assert memory["learning_style"] == "Visual learner, prefers hands-on."
            assert memory["knowledge_state"] == "Mastered: phase changes. Misconceptions: none."
            assert memory["interests"] == "Excited about ice and water."

            # Verify retrieve was called 4 times
            assert mock_client.agents.blocks.retrieve.call_count == 4


# ── Test 4: Update student memory ────────────────────────────


def test_update_student_memory_after_session():
    """Verify session summary is sent to Letta agent for memory update."""
    from memory.letta_client import update_student_memory_after_session

    with patch.dict(os.environ, {"LETTA_BASE_URL": "http://localhost:8283"}):
        with patch("memory.letta_client.Letta") as mock_letta_cls:
            mock_client = MagicMock()
            mock_letta_cls.return_value = mock_client

            update_student_memory_after_session(
                agent_id="agent-123",
                session_summary="Student explored all three phases and asked great questions.",
                topic="changing_states",
                duration_minutes=15
            )

            mock_client.agents.messages.create.assert_called_once()

            # Verify the call arguments
            call_args = mock_client.agents.messages.create.call_args
            assert call_args.kwargs["agent_id"] == "agent-123"

            messages = call_args.kwargs["messages"]
            assert len(messages) == 1
            assert messages[0]["role"] == "user"

            content = messages[0]["content"]
            assert "changing_states" in content
            assert "15min" in content
            assert "Student explored all three phases" in content
            assert "update the student's memory blocks" in content


# ── Test 5: Graph builder memory injection ───────────────────


def test_observation_graph_with_memory():
    """Verify observation graph compiles with student memory injection."""
    from graphs.observation import build_observation_graph
    from topics.changing_states.config import changing_states_config
    from topics.changing_states.reactions import changing_states_reactions

    student_memory = {
        "student_profile": "Name: Test. Age: 10.",
        "learning_style": "Visual learner.",
        "knowledge_state": "Mastered: phase changes.",
        "interests": "Excited about ice.",
    }

    graph = build_observation_graph(
        topic_config=changing_states_config,
        reaction_registry=changing_states_reactions,
        student_memory=student_memory
    )

    assert graph is not None

    # Verify graph has expected nodes
    graph_data = graph.get_graph()
    node_ids = list(graph_data.nodes)
    assert "event_classifier" in node_ids
    assert "reaction_lookup" in node_ids
    assert "ai_reasoning" in node_ids
    assert "deliver_reaction" in node_ids


def test_chat_graph_with_memory():
    """Verify chat graph compiles with student memory injection."""
    from graphs.chat import build_chat_graph
    from topics.changing_states.config import changing_states_config

    student_memory = {
        "student_profile": "Name: Test. Age: 10.",
        "learning_style": "Visual learner.",
        "knowledge_state": "Mastered: phase changes.",
        "interests": "Excited about ice.",
    }

    graph = build_chat_graph(
        topic_config=changing_states_config,
        student_memory=student_memory
    )

    assert graph is not None

    # Verify graph has expected nodes
    graph_data = graph.get_graph()
    node_ids = list(graph_data.nodes)
    assert "respond" in node_ids


def test_graphs_compile_without_memory():
    """Verify graphs compile successfully when student_memory is None."""
    from graphs.observation import build_observation_graph
    from graphs.chat import build_chat_graph
    from topics.changing_states.config import changing_states_config
    from topics.changing_states.reactions import changing_states_reactions

    # Test observation graph without memory
    obs_graph = build_observation_graph(
        topic_config=changing_states_config,
        reaction_registry=changing_states_reactions,
        student_memory=None
    )
    assert obs_graph is not None

    # Test chat graph without memory
    chat_graph = build_chat_graph(
        topic_config=changing_states_config,
        student_memory=None
    )
    assert chat_graph is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
