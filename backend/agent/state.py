"""Orchestrator state schema for LangGraph."""
from typing import Any, Dict, List, Optional
from langgraph.graph import MessagesState


class OrchestratorState(MessagesState):
    """
    Widget platform orchestrator state.

    Extends MessagesState (which provides `messages` with add-reducer).

    Attributes:
        messages: Conversation messages (from MessagesState, auto-reduced)
        active_widgets: Currently rendered widget IDs (dumb + smart)
        focused_agent: Sub-agent that owns chat right now. None = orchestrator.
        widget_state: State of the focused smart widget. Empty when no focus.
        widget_summaries: Past focus sessions — summary strings keyed by widget ID.
    """
    active_widgets: List[str] = []
    focused_agent: Optional[str] = None
    widget_state: Dict[str, Any] = {}
    widget_summaries: Dict[str, str] = {}
