"""Agent state schema for LangGraph."""
from typing import List
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    Represents the state of the agent graph.

    Attributes:
        messages: List of conversation messages
        current_task: Current task being processed
        result: Final result or response
    """
    messages: List[str]
    current_task: str
    result: str
