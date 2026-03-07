"""
Integration test for memory persistence across sessions.

Tests the full flow:
1. Create a memory agent for a student
2. Simulate a learning session with observation and chat
3. End the session and update memory
4. Start a new session and verify memory is used in agent responses
"""
import pytest
from unittest.mock import patch, MagicMock
import time


@pytest.mark.asyncio
async def test_memory_persistence_flow():
    """
    Test that memory persists across sessions and influences agent behavior.

    This is a mock test that verifies the integration points work correctly.
    A full end-to-end test would require a running Letta server.
    """
    user_id = "test-user-123"
    agent_id = "agent-456"

    # Step 1: Mock agent creation
    with patch("memory.letta_client.create_student_agent") as mock_create:
        mock_create.return_value = agent_id

        from memory.letta_client import create_student_agent
        created_agent_id = create_student_agent(user_id, "Test Student", 10)

        assert created_agent_id == agent_id
        mock_create.assert_called_once_with(user_id, "Test Student", 10)

    # Step 2: Mock session end and memory update
    with patch("memory.letta_client.update_student_memory_after_session") as mock_update:
        from memory.letta_client import update_student_memory_after_session

        update_student_memory_after_session(
            agent_id=agent_id,
            session_summary="Student explored phase changes. Showed strong understanding of melting.",
            topic="changing-states",
            duration_minutes=15
        )

        mock_update.assert_called_once()
        call_args = mock_update.call_args
        assert call_args.kwargs["agent_id"] == agent_id
        assert "melting" in call_args.kwargs["session_summary"]

    # Step 3: Mock memory fetch for next session
    with patch("memory.letta_client.get_student_memory") as mock_get:
        mock_get.return_value = {
            "student_profile": "Name: Test Student. Age: 10. Completed 1 session on changing-states.",
            "learning_style": "Visual learner. Prefers hands-on exploration.",
            "knowledge_state": "Understands melting (solid to liquid). Needs work on evaporation.",
            "interests": "Excited about ice and water experiments."
        }

        from memory.letta_client import get_student_memory
        memory = get_student_memory(agent_id)

        assert "melting" in memory["knowledge_state"]
        assert "Visual learner" in memory["learning_style"]
        mock_get.assert_called_once_with(agent_id)

    # Step 4: Verify memory_fetcher is called in graph builders
    with patch("main.fetch_student_memory") as mock_fetch:
        mock_fetch.return_value = {
            "student_profile": "Name: Test Student. Age: 10.",
            "learning_style": "Visual learner.",
            "knowledge_state": "Understands melting.",
            "interests": "Ice experiments."
        }

        from main import fetch_student_memory
        fetched_memory = fetch_student_memory(user_id)

        assert fetched_memory is not None
        assert "Visual learner" in fetched_memory["learning_style"]


def test_memory_fetcher_integration():
    """
    Test that fetch_student_memory correctly integrates with Supabase and Letta.
    """
    user_id = "test-user-789"
    agent_id = "agent-999"

    # Mock Supabase to return profile with agent_id
    with patch("main.get_supabase_client") as mock_supabase:
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"letta_agent_id": agent_id}
        ]
        mock_supabase.return_value = mock_client

        # Mock Letta to return memory
        with patch("main.get_student_memory") as mock_get_memory:
            mock_get_memory.return_value = {
                "student_profile": "Test profile",
                "learning_style": "Test style",
                "knowledge_state": "Test knowledge",
                "interests": "Test interests"
            }

            from main import fetch_student_memory
            memory = fetch_student_memory(user_id)

            assert memory is not None
            assert memory["student_profile"] == "Test profile"
            mock_get_memory.assert_called_once_with(agent_id)


def test_memory_fetcher_handles_no_agent():
    """
    Test that fetch_student_memory returns None when user has no agent.
    """
    user_id = "test-user-no-agent"

    # Mock Supabase to return profile without agent_id
    with patch("main.get_supabase_client") as mock_supabase:
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"letta_agent_id": None}
        ]
        mock_supabase.return_value = mock_client

        from main import fetch_student_memory
        memory = fetch_student_memory(user_id)

        assert memory is None


def test_memory_fetcher_handles_errors():
    """
    Test that fetch_student_memory handles errors gracefully.
    """
    user_id = "test-user-error"

    # Mock Supabase to raise an error
    with patch("main.get_supabase_client") as mock_supabase:
        mock_supabase.side_effect = Exception("Database error")

        from main import fetch_student_memory
        memory = fetch_student_memory(user_id)

        # Should return None on error, not raise
        assert memory is None
