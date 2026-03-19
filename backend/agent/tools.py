"""Agent tools registry.
Skeleton tools + tools loaded from the active example.
"""
import os
from langchain_core.tools import tool

# Load tools from all examples
# CHANGE THIS: set ACTIVE_EXAMPLE env var to switch examples
# Options: student_dashboard, science_lab, etc.
ACTIVE_EXAMPLE = os.getenv("ACTIVE_EXAMPLE", "student_dashboard")


def get_example_tools():
    """Dynamically load tools from the active example."""
    try:
        module = importlib.import_module(f"examples.{ACTIVE_EXAMPLE}.tools")
        return getattr(module, "all_tools", [])
    except ImportError as e:
        logger.warning(f"Could not load tools from {ACTIVE_EXAMPLE}: {e}")
        return []


# Try to import the active example's tools
try:
    import importlib
    import logging

    logger = logging.getLogger(__name__)
    example_tools = get_example_tools()
except ImportError:
    example_tools = []


@tool
def get_current_time() -> str:
    """Get the current server time."""
    from datetime import datetime

    return datetime.now().isoformat()


# Tool registry — example tools + skeleton tools
all_tools = example_tools + [get_current_time]
