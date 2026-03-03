# ═══════════════════════════════════════════════════════════
# Agent Entry Point — builds and registers both LangGraph agents
#
# Uses ag_ui_langgraph to create HTTP endpoints that the frontend
# can connect to directly via RemoteChain.
# ═══════════════════════════════════════════════════════════

from config import load_env

# Load .env before any other imports that might need API keys
load_env()

from fastapi import FastAPI
from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
import uvicorn

from graphs.chat import build_chat_graph
from graphs.observation import build_observation_graph
from topics.changing_states.config import changing_states_config
from topics.changing_states.reactions import changing_states_reactions

# ── Build both graphs with config injected via closure ───

observation_graph = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
)

chat_graph = build_chat_graph(changing_states_config)

# ── Create FastAPI app and register agents ────────────────

app = FastAPI()

# Register observation agent
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAgent(
        name="observation-changing-states",
        description="Observes simulation events and delivers companion reactions",
        graph=observation_graph,
    ),
    path="/copilotkit/agent/observation-changing-states",
)

# Register chat agent
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAgent(
        name="chat-changing-states",
        description="Answers questions about states of matter for ages 6-8",
        graph=chat_graph,
    ),
    path="/copilotkit/agent/chat-changing-states",
)

@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}



