"""
Session management routes.

Handles session lifecycle events like session end, which triggers
memory updates in Letta.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from middleware.auth import get_current_user
from memory.letta_client import update_student_memory_after_session
from lib.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class EndSessionRequest(BaseModel):
    topic: str
    duration_minutes: int
    session_summary: str


class EndSessionResponse(BaseModel):
    success: bool
    memory_updated: bool


@router.post("/{user_id}/end", response_model=EndSessionResponse)
async def end_session(
    user_id: str,
    request: EndSessionRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    End a learning session and update student memory.

    Requires authentication. Only users can end their own sessions.
    If the user has a Letta agent, sends session summary for memory update.
    """
    # Check authentication
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Authorization check: only allow users to end their own sessions
    if user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end session for this user"
        )

    supabase = await run_in_threadpool(get_supabase_client)

    # Fetch user profile to get letta_agent_id
    profile_response = await run_in_threadpool(
        lambda: supabase.table("profiles").select("letta_agent_id").eq("id", user_id).execute()
    )
    if not profile_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )

    profile = profile_response.data[0]
    agent_id = profile.get("letta_agent_id")

    # If no agent, session ends successfully but no memory update
    if not agent_id:
        logger.info(f"Session ended for user {user_id} (no memory agent)")
        return EndSessionResponse(success=True, memory_updated=False)

    try:
        # Update student memory
        await run_in_threadpool(
            update_student_memory_after_session,
            agent_id=agent_id,
            session_summary=request.session_summary,
            topic=request.topic,
            duration_minutes=request.duration_minutes
        )

        logger.info(f"Session ended for user {user_id}, memory updated in agent {agent_id}")
        return EndSessionResponse(success=True, memory_updated=True)

    except Exception as e:
        logger.error(f"Failed to update memory for user {user_id}, agent {agent_id}: {e}", exc_info=True)
        # Don't fail the session end if memory update fails
        return EndSessionResponse(success=True, memory_updated=False)
