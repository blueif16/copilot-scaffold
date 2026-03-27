"""Particle simulation subagent domain tools.

Bound exclusively to the particle_sim subagent LLM.
Do NOT include handoff_to_orchestrator — the skeleton injects it automatically.

Tool return values are merged into widget_state by the skeleton's tools_node.
"""
from langchain_core.tools import tool


@tool
def set_particle_state(new_state: str) -> dict:
    """Change the particle simulation to a new state.

    Args:
        new_state: Target matter state - must be 'solid', 'liquid', or 'gas'
    """
    valid = {"solid", "liquid", "gas"}
    if new_state not in valid:
        return {"error": f"Invalid state '{new_state}'. Must be one of: solid, liquid, gas"}
    return {"current_state": new_state}


all_tools = [set_particle_state]
