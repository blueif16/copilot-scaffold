"""Science Lab — orchestrator-level spawn tools.

Each tool here is bound to the ORCHESTRATOR LLM.
Returning a dict from a spawn tool sets the initial widget_state for the subagent.
"""
from langchain_core.tools import tool


@tool
def show_particle_sim(initial_state: str = "gas") -> dict:
    """Spawn the particle simulation widget. [Layout: full width, fill height]

    Args:
        initial_state: Starting matter state - "solid", "liquid", or "gas"
    """
    return {"current_state": initial_state}


# Spawn tools for this example (loaded by examples/__init__.py:load_all_example_tools)
all_tools = [show_particle_sim]
