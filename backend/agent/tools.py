"""Agent tools registry.

Backend-only tools live here. Widget spawn tools (show_user_card, show_topic_progress, etc.)
are registered on the FRONTEND via useFrontendTool and arrive here through
state["copilotkit"]["actions"]. They must NOT be duplicated as backend tools,
or LangGraph's ToolNode will consume the call before the AG-UI protocol can
route it to the frontend for rendering.
"""
import logging
from typing import List, Optional
from langchain_core.tools import tool, BaseTool

logger = logging.getLogger(__name__)


@tool
def clear_canvas(widget_ids: Optional[List[str]] = None) -> str:
    """Remove widgets from the canvas.

    Args:
        widget_ids: IDs of specific widgets to remove (e.g. ["user_card", "topic_progress"]).
                    Omit or pass None/[] to clear ALL widgets.
    """
    # State mutation is handled by tools_node in graph.py which intercepts this call.
    return ""


# Only truly backend-only tools go here.
# Frontend widget tools come from state["copilotkit"]["actions"] at runtime.
backend_tools: list[BaseTool] = [clear_canvas]
backend_tool_names: set[str] = {t.name for t in backend_tools}

logger.info(f"Backend-only tools: {backend_tool_names}")
