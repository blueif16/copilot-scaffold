"""Skeleton protocol tools.

Only tools that are part of the scaffold contract live here.
Content-specific tools (widget spawn tools, domain tools) live in examples/.
"""
from typing import List, Optional
from langchain_core.tools import tool, BaseTool


@tool
def clear_canvas(widget_ids: Optional[List[str]] = None) -> str:
    """Remove widgets from the canvas.

    Args:
        widget_ids: IDs of specific widgets to remove (e.g. ["user_card", "topic_progress"]).
                    Omit or pass None/[] to clear ALL widgets.
    """
    # State mutation handled by tools_node in graph.py.
    return ""


@tool
def handoff_to_orchestrator() -> dict:
    """Return control to the main orchestrator.
    Call this when the user is done with this widget or asks for something outside your domain."""
    # State mutation (clear focused_agent) handled by tools_node in graph.py.
    return {"status": "handing_off"}


# Protocol tools always present in the skeleton.
skeleton_tools: list[BaseTool] = [clear_canvas]
