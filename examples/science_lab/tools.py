# Science Lab example — backend tool definitions.
# This example has different tools than student_dashboard.
from langchain_core.tools import tool


@tool
def show_particle_sim(initial_state: str = "gas") -> dict:
    """Spawn the particle simulation widget.

    Args:
        initial_state: Initial state - "solid", "liquid", or "gas"
    """
    return {
        "widget": "particle_sim",
        "action": "spawn",
        "props": {"initial_state": initial_state},
    }


# Science lab has different tools than student dashboard
all_tools = [show_particle_sim]
