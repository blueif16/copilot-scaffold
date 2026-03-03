# ═══════════════════════════════════════════════════════════
# Agent Entry Point — builds and registers both LangGraph agents
#
# Graph IDs must EXACTLY match:
#   - langgraph.json graph keys
#   - useCoAgent name on the frontend
#   - LangGraphAgent graphId in the Next.js runtime
# ═══════════════════════════════════════════════════════════

from config import load_env

# Load .env before any other imports that might need API keys
load_env()

from copilotkit import CopilotKitRemoteEndpoint, LangGraphAgent

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

# ── Register with CopilotKit ────────────────────────────

sdk = CopilotKitRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="observation-changing-states",
            description="Observes simulation events and delivers companion reactions",
            graph=observation_graph,
        ),
        LangGraphAgent(
            name="chat-changing-states",
            description="Answers questions about states of matter for ages 6-8",
            graph=chat_graph,
        ),
    ]
)
