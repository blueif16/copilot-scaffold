"""Science Lab — tools.

Spawn tools (show_particle_sim) are registered via SUBAGENTS in __init__.py.
This file exports only standalone backend tools (MCP queries, DB lookups, etc.)
that the orchestrator can call without spawning a widget.
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

# Standalone backend tools only — spawn tools come from SUBAGENTS in __init__.py
all_tools = [*_mcp_tools]
