"""
Tests for session management endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def test_end_session_route_exists():
    """Test that the sessions endpoint is registered."""
    from main import app

    client = TestClient(app)

    # Should return 401 without auth, not 404
    response = client.post("/api/sessions/test-user-id/end", json={
        "topic": "changing-states",
        "duration_minutes": 15,
        "session_summary": "Student explored phase changes"
    })

    assert response.status_code == 401


def test_end_session_without_memory_agent():
    """Test ending session for user without Letta agent."""
    from main import app

    client = TestClient(app)

    # Mock authentication
    with patch("middleware.auth.get_current_user") as mock_auth:
        mock_auth.return_value = {"id": "test-user-id", "email": "test@example.com"}

        # Mock Supabase to return profile without agent_id
        with patch("routes.sessions.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
                {"letta_agent_id": None}
            ]
            mock_supabase.return_value = mock_client

            response = client.post("/api/sessions/test-user-id/end", json={
                "topic": "changing-states",
                "duration_minutes": 15,
                "session_summary": "Student explored phase changes"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["memory_updated"] is False


def test_end_session_with_memory_agent():
    """Test ending session for user with Letta agent."""
    from main import app

    client = TestClient(app)

    # Mock authentication
    with patch("middleware.auth.get_current_user") as mock_auth:
        mock_auth.return_value = {"id": "test-user-id", "email": "test@example.com"}

        # Mock Supabase to return profile with agent_id
        with patch("routes.sessions.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
                {"letta_agent_id": "agent-123"}
            ]
            mock_supabase.return_value = mock_client

            # Mock Letta memory update
            with patch("routes.sessions.update_student_memory_after_session") as mock_update:
                response = client.post("/api/sessions/test-user-id/end", json={
                    "topic": "changing-states",
                    "duration_minutes": 15,
                    "session_summary": "Student explored phase changes"
                })

                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["memory_updated"] is True

                # Verify memory update was called
                mock_update.assert_called_once_with(
                    agent_id="agent-123",
                    session_summary="Student explored phase changes",
                    topic="changing-states",
                    duration_minutes=15
                )


def test_end_session_unauthorized():
    """Test that users can only end their own sessions."""
    from main import app

    client = TestClient(app)

    # Mock authentication as different user
    with patch("middleware.auth.get_current_user") as mock_auth:
        mock_auth.return_value = {"id": "other-user-id", "email": "other@example.com"}

        response = client.post("/api/sessions/test-user-id/end", json={
            "topic": "changing-states",
            "duration_minutes": 15,
            "session_summary": "Student explored phase changes"
        })

        assert response.status_code == 403
