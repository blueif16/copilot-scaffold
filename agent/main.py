# ═══════════════════════════════════════════════════════════
# Agent Entry Point — builds and registers both LangGraph agents
#
# Uses add_langgraph_fastapi_endpoint to expose agents via AG-UI protocol.
# Frontend connects via LangGraphHttpAgent to agent-specific paths.
# ═══════════════════════════════════════════════════════════

from config import load_env

# Load .env before any other imports that might need API keys
load_env()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from pydantic import BaseModel
import uvicorn
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

from graphs.chat import build_chat_graph
from graphs.observation import build_observation_graph
from graphs.course_builder import build_course_builder_graph
from topics.changing_states.config import changing_states_config
from topics.changing_states.reactions import changing_states_reactions
from topics.electric_circuits.config import electric_circuits_config
from topics.electric_circuits.reactions import electric_circuits_reactions
from topics.genetics_basics.config import genetics_basics_config
from topics.genetics_basics.reactions import genetics_basics_reactions
from middleware.auth import get_current_user
from memory.letta_client import create_student_agent, update_student_memory_after_session, get_student_memory
from lib.supabase_client import get_supabase_client

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

# TODO: Fetch student memory and pass to graph builders in Slice 13

# Changing States (Level 1, Ages 6-8)
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

chat_graph_changing_states = build_chat_graph(
    changing_states_config,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

# Electric Circuits (Level 2, Ages 9-10)
observation_graph_electric_circuits = build_observation_graph(
    electric_circuits_config,
    electric_circuits_reactions,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

chat_graph_electric_circuits = build_chat_graph(
    electric_circuits_config,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

# Genetics Basics (Level 3, Ages 11-12)
observation_graph_genetics = build_observation_graph(
    genetics_basics_config,
    genetics_basics_reactions,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

chat_graph_genetics = build_chat_graph(
    genetics_basics_config,
    student_memory=None,  # TODO: Fetch from Letta in Slice 13
)

# Course Builder (Teacher-facing)
course_builder_graph = build_course_builder_graph()

# ── Create FastAPI app and register agents ────────────────

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a Letta memory agent for a new student.

    Requires authentication. Creates agent and updates profiles.letta_agent_id.
    """
    # Authorization check: only allow users to create agents for themselves
    if user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create agent for this user"
        )

    supabase = get_supabase_client()

    # Check if user exists
    profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
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
        # Create Letta agent
        agent_id = create_student_agent(user_id, request.name, request.age)

        try:
            # Update profiles table with agent_id
            supabase.table("profiles").update({
                "letta_agent_id": agent_id
            }).eq("id", user_id).execute()
        except Exception as db_error:
            # Database update failed - attempt to clean up the created agent
            logger.error(f"Failed to update profile for user {user_id} with agent {agent_id}: {db_error}", exc_info=True)
            try:
                # Note: Letta client doesn't expose delete_agent in current implementation
                # This would need to be added if cleanup is critical
                logger.warning(f"Agent {agent_id} created but not linked to user {user_id} - manual cleanup may be needed")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup agent {agent_id}: {cleanup_error}", exc_info=True)
            raise

        return CreateMemoryAgentResponse(agent_id=agent_id)

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
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update student memory after a learning session.

    Requires authentication. Fetches letta_agent_id and updates memory.
    """
    # Authorization check: only allow users to update their own memory
    if user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update memory for this user"
        )

    supabase = get_supabase_client()

    # Fetch user profile to get letta_agent_id
    profile_response = supabase.table("profiles").select("letta_agent_id").eq("id", user_id).execute()
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
        update_student_memory_after_session(
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


