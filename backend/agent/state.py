"""Agent state schema for LangGraph - Science Labs Edition."""
from typing import List, Optional, Literal, Dict, Any
from typing_extensions import TypedDict


class LabState(TypedDict):
    """
    State for the Delegative UI Science Labs agent.

    Attributes:
        messages: List of conversation messages
        active_lab: Currently active lab (states_of_matter, wheel_axle, light_shadows)
        active_module: Currently active module within a lab
        lab_progress: Progress tracking per lab
        student_name: Name of the student
        pending_approval: HITL payload for approval requests
    """
    messages: List[Any]
    active_lab: Optional[Literal["states_of_matter", "wheel_axle", "light_shadows"]]
    active_module: Optional[str]
    lab_progress: Dict[str, int]
    student_name: Optional[str]
    pending_approval: Optional[Dict[str, Any]]
    result: str


# Alias for backwards compatibility
AgentState = LabState
