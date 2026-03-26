"""Science Lab — orchestrator-level spawn tools.

Each tool here is bound to the ORCHESTRATOR LLM.
Returning a dict from a spawn tool sets the initial widget_state for the subagent.
"""
import logging
from langchain_core.tools import tool
from examples.mcp_client import MCPClient, create_mcp_tool

logger = logging.getLogger(__name__)


@tool
def show_particle_sim(initial_state: str = "gas") -> dict:
    """Spawn the particle simulation widget. [Layout: full width, fill height]

    Args:
        initial_state: Starting matter state - "solid", "liquid", or "gas"
    """
    return {"current_state": initial_state}


# MCP tools — bound to the orchestrator so it can query teaching-db before spawning widgets
_mcp_tools = []
try:
    _mcp = MCPClient().connect()
    _mcp_tools = [create_mcp_tool(_mcp, t) for t in _mcp.list_tools()]
    logger.info(f"[science_lab] loaded {len(_mcp_tools)} MCP tools from teaching-db")
except Exception as e:
    logger.warning(f"[science_lab] failed to connect to MCP server: {e}")

# Spawn tools + MCP tools for this example (loaded by examples/__init__.py:load_all_example_tools)
all_tools = [show_particle_sim, *_mcp_tools]
