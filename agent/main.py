# ═══════════════════════════════════════════════════════════
# Agent Entry Point — builds and registers both LangGraph agents
#
# Uses add_langgraph_fastapi_endpoint to expose agents via AG-UI protocol.
# Frontend connects via LangGraphHttpAgent to agent-specific paths.
# ═══════════════════════════════════════════════════════════

from config import load_env

# Load .env before any other imports that might need API keys
load_env()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
import uvicorn

from graphs.chat import build_chat_graph
from graphs.observation import build_observation_graph
from topics.changing_states.config import changing_states_config
from topics.changing_states.reactions import changing_states_reactions
from topics.electric_circuits.config import electric_circuits_config
from topics.electric_circuits.reactions import electric_circuits_reactions

# ── Build graphs with config injected via closure ───

# Changing States (Level 1, Ages 6-8)
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
)

chat_graph_changing_states = build_chat_graph(changing_states_config)

# Electric Circuits (Level 2, Ages 9-10)
observation_graph_electric_circuits = build_observation_graph(
    electric_circuits_config,
    electric_circuits_reactions,
)

chat_graph_electric_circuits = build_chat_graph(electric_circuits_config)

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

# Register Changing States agents
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

# Register Electric Circuits agents
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

# Health check endpoint
@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}



