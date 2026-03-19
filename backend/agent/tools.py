"""Agent tools registry.

Backend-only tools live here. Widget spawn tools (show_user_card, show_topic_progress, etc.)
are registered on the FRONTEND via useFrontendTool and arrive here through
state["copilotkit"]["actions"]. They must NOT be duplicated as backend tools,
or LangGraph's ToolNode will consume the call before the AG-UI protocol can
route it to the frontend for rendering.
"""
import logging
from langchain_core.tools import tool, BaseTool

logger = logging.getLogger(__name__)


@tool
def get_current_time() -> str:
    """Get the current server time."""
    from datetime import datetime
    return datetime.now().isoformat()


# Only truly backend-only tools go here.
# Frontend widget tools come from state["copilotkit"]["actions"] at runtime.
backend_tools: list[BaseTool] = [get_current_time]
backend_tool_names: set[str] = {t.name for t in backend_tools}

logger.info(f"Backend-only tools: {backend_tool_names}")
