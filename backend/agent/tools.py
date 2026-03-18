"""LangGraph tools for Delegative UI Science Labs."""
from langchain_core.tools import tool
from typing import Optional, Literal


@tool
def show_lab_selector() -> str:
    """Show the overview card for all three labs (States of Matter, Wheel & Axle, Light & Shadows)."""
    return "lab_selector displayed"


@tool
def show_ice_cream_maker(
    temperature: float = -5.0,
    ingredient: str = "water"
) -> str:
    """Show the ice cream maker phase-change simulation.

    Args:
        temperature: Starting temperature in Celsius. Use -5 for solid ice cream.
        ingredient: The ingredient whose phase to highlight (water, sugar, cream).
    """
    return f"ice_cream_maker displayed at {temperature}°C, featuring {ingredient}"


@tool
def show_particle_simulation(
    state_of_matter: Literal["solid", "liquid", "gas"] = "liquid"
) -> str:
    """Show the particle interaction simulation (pushes and pulls).

    Args:
        state_of_matter: Initial particle arrangement - solid, liquid, or gas
    """
    return f"particle_simulation displayed in {state_of_matter} state"


@tool
def show_wheel_axle_workshop(
    era: Literal["ancient", "medieval", "industrial", "modern"] = "ancient"
) -> str:
    """Show the Mesopotamian wheel and axle innovation explorer.

    Args:
        era: Historical era to highlight - ancient (3500 BCE), medieval (1200 CE), industrial (1850 CE), modern (2024 CE)
    """
    return f"wheel_axle_workshop displayed for {era} era"


@tool
def show_vehicle_designer() -> str:
    """Show the vehicle design workshop sandbox."""
    return "vehicle_designer displayed"


@tool
def show_camera_obscura(scene: str = "cityscape") -> str:
    """Show the interactive camera obscura.

    Args:
        scene: Scene to project - cityscape, tree, lighthouse, or mountain
    """
    return f"camera_obscura displayed with {scene} scene"


@tool
def show_shadow_ar_module(
    latitude: float = 35.0,
    time_of_day: int = 12
) -> str:
    """Show the shadow angle / time-of-day simulator.

    Args:
        latitude: Location latitude (-90 to 90)
        time_of_day: Hour of day 0-23
    """
    return f"shadow_ar_module at lat={latitude}, hour={time_of_day}"


@tool
def request_student_approval(
    message: str,
    next_module: str
) -> str:
    """Pause and ask the student to approve before advancing to the next lab section.
    Use this before transitioning between lab modules or major topics.

    Args:
        message: The message to display to the student
        next_module: The name of the next module/lab to explore
    """
    return f"approval_requested: {message}"


# All tools for binding to LLM
all_tools = [
    show_lab_selector,
    show_ice_cream_maker,
    show_particle_simulation,
    show_wheel_axle_workshop,
    show_vehicle_designer,
    show_camera_obscura,
    show_shadow_ar_module,
    request_student_approval,
]
