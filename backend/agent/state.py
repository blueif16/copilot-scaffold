"""Generic agent state schema for LangGraph."""
from typing import Any, Dict
from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """
    Base agent state for the scaffold.

    Extends MessagesState (which provides `messages` with add-reducer).
    Apps extend this by adding their own fields.

    Attributes:
        messages: Conversation messages (from MessagesState, auto-reduced)
        metadata: App-specific metadata dict (extensible without schema changes)
    """
    metadata: Dict[str, Any]
