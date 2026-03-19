"""Agent tools registry.
Skeleton tools + tools loaded from ALL examples (auto-discovered).
"""
import logging
from langchain_core.tools import tool

logger = logging.getLogger(__name__)


def get_all_example_tools():
    """Load all tools from all examples (auto-discovered)."""
    from examples import load_all_example_tools
    return load_all_example_tools()


# Load tools from all examples
try:
    example_tools = get_all_example_tools()
except Exception as e:
    logger.warning(f"Could not load example tools: {e}")
    example_tools = []


@tool
def get_current_time() -> str:
    """Get the current server time."""
    from datetime import datetime

    return datetime.now().isoformat()


# Tool registry — ALL example tools + skeleton tools
all_tools = example_tools + [get_current_time]
