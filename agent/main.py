# ═══════════════════════════════════════════════════════════
# Agent Entry Point — builds and registers both LangGraph agents
#
# Uses add_langgraph_fastapi_endpoint to expose agents via AG-UI protocol.
# Frontend connects via LangGraphHttpAgent to agent-specific paths.
# ═══════════════════════════════════════════════════════════

from .config import load_env

# Load .env before any other imports that might need API keys
load_env()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from pydantic import BaseModel
import uvicorn
import logging
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

from .graphs.chat import build_chat_graph
from .graphs.observation import build_observation_graph
from .graphs.course_builder import build_course_builder_graph
from .topics.changing_states.config import changing_states_config
from .topics.changing_states.reactions import changing_states_reactions
from .topics.electric_circuits.config import electric_circuits_config
from .topics.electric_circuits.reactions import electric_circuits_reactions
from .topics.genetics_basics.config import genetics_basics_config
from .topics.genetics_basics.reactions import genetics_basics_reactions
from .middleware.auth import get_current_user
from .middleware import FixAGUIProtocolMiddleware
from .memory.letta_client import create_student_agent, update_student_memory_after_session, get_student_memory
from .lib.supabase_client import get_supabase_client
from .routes.sessions import router as sessions_router

# ── Pydantic models for request/response bodies ───

class CreateMemoryAgentRequest(BaseModel):
    name: str
    age: int

class CreateMemoryAgentResponse(BaseModel):
    agent_id: str

class UpdateMemoryRequest(BaseModel):
    session_summary: str
    topic: str
    duration_minutes: int

class UpdateMemoryResponse(BaseModel):
    success: bool

# ── Build graphs with config injected via closure ───

# Memory fetcher function for per-request memory injection
def fetch_student_memory(user_id: str) -> Optional[dict]:
    """
    Fetch student memory from Letta for a given user_id.

    Returns None if user has no agent or if fetch fails.
    """
    try:
        supabase = get_supabase_client()
        profile_response = supabase.table("profiles").select("letta_agent_id").eq("id", user_id).execute()

        if not profile_response.data:
            return None

        agent_id = profile_response.data[0].get("letta_agent_id")
        if not agent_id:
            return None

        return get_student_memory(agent_id)
    except Exception as e:
        logger.error(f"Failed to fetch memory for user {user_id}: {e}")
        return None

# Changing States (Level 1, Ages 6-8)
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
    memory_fetcher=fetch_student_memory,
)

chat_graph_changing_states = build_chat_graph(
    changing_states_config,
    memory_fetcher=fetch_student_memory,
)

# Electric Circuits (Level 2, Ages 9-10)
observation_graph_electric_circuits = build_observation_graph(
    electric_circuits_config,
    electric_circuits_reactions,
    memory_fetcher=fetch_student_memory,
)

chat_graph_electric_circuits = build_chat_graph(
    electric_circuits_config,
    memory_fetcher=fetch_student_memory,
)

# Genetics Basics (Level 3, Ages 11-12)
observation_graph_genetics = build_observation_graph(
    genetics_basics_config,
    genetics_basics_reactions,
    memory_fetcher=fetch_student_memory,
)

chat_graph_genetics = build_chat_graph(
    genetics_basics_config,
    memory_fetcher=fetch_student_memory,
)

# Course Builder (Teacher-facing)
course_builder_graph = build_course_builder_graph()

# ── Create FastAPI app and register agents ────────────────

app = FastAPI()

# Add protocol fix middleware (must be before CORS)
app.add_middleware(FixAGUIProtocolMiddleware)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register session routes
app.include_router(sessions_router)

# ── Register all agents ────────────────────────────────────

# Changing States (Level 1, Ages 6-8)
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="observation-changing-states",
        description="Observes simulation events and delivers companion reactions",
        graph=observation_graph_changing_states,
    ),
    path="/agents/observation-changing-states",
)

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="chat-changing-states",
        description="Answers questions about states of matter for ages 6-8",
        graph=chat_graph_changing_states,
    ),
    path="/agents/chat-changing-states",
)

# Electric Circuits (Level 2, Ages 9-10)
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="observation-electric-circuits",
        description="Observes circuit building events and delivers companion reactions",
        graph=observation_graph_electric_circuits,
    ),
    path="/agents/observation-electric-circuits",
)

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="chat-electric-circuits",
        description="Answers questions about electric circuits for ages 9-10",
        graph=chat_graph_electric_circuits,
    ),
    path="/agents/chat-electric-circuits",
)

# Genetics Basics (Level 3, Ages 11-12)
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="observation-genetics-basics",
        description="Observes genetics experiments and delivers lab partner reactions",
        graph=observation_graph_genetics,
    ),
    path="/agents/observation-genetics-basics",
)

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="chat-genetics-basics",
        description="Answers questions about genetics for ages 11-12",
        graph=chat_graph_genetics,
    ),
    path="/agents/chat-genetics-basics",
)

# Course Builder (Teacher-facing)
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="course-builder",
        description="Helps teachers create interactive science lessons with JSX code generation",
        graph=course_builder_graph,
    ),
    path="/agents/course-builder",
)

# Health check endpoint
@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}


# Example protected endpoint (for testing auth)
@app.get("/me")
async def get_me(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """
    Get current user information.

    Optional authentication - returns user data if authenticated, 401 if not.
    """
    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "display_name": user.get("display_name"),
    }


# ── Memory Agent Endpoints ─────────────────────────────────

@app.post("/api/students/{user_id}/create-memory-agent", response_model=CreateMemoryAgentResponse)
async def create_memory_agent_endpoint(
    user_id: str,
    request: CreateMemoryAgentRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Create a Letta memory agent for a new student.

    Requires authentication. Creates agent and updates profiles.letta_agent_id.
    """
    # Check authentication first
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Authorization check: only allow users to create agents for themselves
    if user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create agent for this user"
        )

    supabase = await run_in_threadpool(get_supabase_client)

    # Check if user exists
    profile_response = await run_in_threadpool(
        lambda: supabase.table("profiles").select("*").eq("id", user_id).execute()
    )
    if not profile_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )

    profile = profile_response.data[0]

    # Check if agent already exists
    if profile.get("letta_agent_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Memory agent already exists for user {user_id}"
        )

    try:
        # Reserve the slot atomically to prevent race conditions
        # Use a placeholder value to indicate creation in progress
        reservation_token = f"creating-{int(time.time())}"

        update_response = await run_in_threadpool(
            lambda: supabase.table("profiles").update({
                "letta_agent_id": reservation_token
            }).eq("id", user_id).is_("letta_agent_id", "null").execute()
        )

        # If no rows were updated, another request won the race
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Agent creation already in progress for user {user_id}"
            )

        try:
            # Create Letta agent
            agent_id = await run_in_threadpool(
                create_student_agent, user_id, request.name, request.age
            )

            # Replace reservation token with actual agent_id
            await run_in_threadpool(
                lambda: supabase.table("profiles").update({
                    "letta_agent_id": agent_id
                }).eq("id", user_id).execute()
            )

            return CreateMemoryAgentResponse(agent_id=agent_id)

        except Exception as agent_error:
            # Agent creation failed - clear the reservation token
            logger.error(f"Failed to create agent for user {user_id}: {agent_error}", exc_info=True)
            try:
                await run_in_threadpool(
                    lambda: supabase.table("profiles").update({
                        "letta_agent_id": None
                    }).eq("id", user_id).execute()
                )
            except Exception as cleanup_error:
                logger.error(f"Failed to clear reservation token for user {user_id}: {cleanup_error}", exc_info=True)
            raise

    except Exception as e:
        logger.error(f"Failed to create memory agent for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create memory agent"
        )


@app.post("/api/students/{user_id}/update-memory", response_model=UpdateMemoryResponse)
async def update_memory_endpoint(
    user_id: str,
    request: UpdateMemoryRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Update student memory after a learning session.

    Requires authentication. Fetches letta_agent_id and updates memory.
    """
    # Check authentication first
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Authorization check: only allow users to update their own memory
    if user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update memory for this user"
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

    if not agent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No memory agent found for user {user_id}. Create one first."
        )

    try:
        # Update student memory
        await run_in_threadpool(
            update_student_memory_after_session,
            agent_id=agent_id,
            session_summary=request.session_summary,
            topic=request.topic,
            duration_minutes=request.duration_minutes
        )

        return UpdateMemoryResponse(success=True)

    except Exception as e:
        logger.error(f"Failed to update memory for user {user_id}, agent {agent_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update memory"
        )


