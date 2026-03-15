from langchain_core.tools import tool


@tool
def show_lab_selector():
    """Show overview of all 3 labs (Ice Cream Lab, Wheel & Vehicle Lab, Shadow & Light Lab)."""
    return "show_lab_selector called"


@tool
def show_ice_cream_maker(temperature: float = -5.0, ingredient: str = "water"):
    """
    Show the Ice Cream Lab - Phase change simulation where users can experiment with freezing different ingredients.

    Args:
        temperature: The temperature in Celsius (default: -5.0)
        ingredient: The ingredient to freeze (default: "water")
    """
    return f"show_ice_cream_maker called with temperature={temperature}, ingredient={ingredient}"


@tool
def show_particle_simulation(state_of_matter: str = "liquid"):
    """
    Show the Particle Sandbox - Interactive simulation of particles in different states of matter.

    Args:
        state_of_matter: The state of matter to simulate - "solid", "liquid", or "gas" (default: "liquid")
    """
    return f"show_particle_simulation called with state_of_matter={state_of_matter}"


@tool
def show_wheel_axle_workshop(era: str = "ancient"):
    """
    Show the Wheel & Axle Workshop - Historical timeline showing the evolution of wheel technology.

    Args:
        era: The historical era to display - "ancient", "medieval", "industrial", or "modern" (default: "ancient")
    """
    return f"show_wheel_axle_workshop called with era={era}"


@tool
def show_vehicle_designer():
    """Show the Vehicle Design Workshop - Interactive vehicle building and testing environment."""
    return "show_vehicle_designer called"


@tool
def show_camera_obscura(scene: str = "cityscape"):
    """
    Show the Camera Obscura - Interactive demonstration of light projection through a small aperture.

    Args:
        scene: The scene to project - "cityscape", "landscape", "portrait", or "abstract" (default: "cityscape")
    """
    return f"show_camera_obscura called with scene={scene}"


@tool
def show_shadow_ar_module(latitude: float = 35.0, time_of_day: int = 12):
    """
    Show the Shadow & Light AR Module - Interactive shadow simulation based on location and time.

    Args:
        latitude: The latitude in degrees (default: 35.0)
        time_of_day: The hour of the day (0-23) (default: 12)
    """
    return f"show_shadow_ar_module called with latitude={latitude}, time_of_day={time_of_day}"


@tool
def request_student_approval(message: str, next_module: str):
    """
    Request student approval to proceed - Human-in-the-loop pause point.

    Args:
        message: The message to display to the student
        next_module: The name of the next module to launch after approval
    """
    return f"request_student_approval called with message='{message}', next_module='{next_module}'"
