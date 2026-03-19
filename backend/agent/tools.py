"""Agent tools registry.
Loads tools from ALL examples automatically.
"""
import importlib
import logging
import os
from typing import List
from langchain_core.tools import tool, BaseTool

logger = logging.getLogger(__name__)


def load_all_example_tools() -> List[BaseTool]:
    """Load all tools from all examples."""
    all_tools: List[BaseTool] = []
    examples_dir = os.path.join(os.path.dirname(__file__), "..", "..", "examples")

    for entry in os.listdir(examples_dir):
        example_path = os.path.join(examples_dir, entry)

        if not os.path.isdir(example_path):
            continue
        if entry.startswith("_") or entry.startswith("."):
            continue

        try:
            module = importlib.import_module(f"examples.{entry}.tools")
            tools = getattr(module, "all_tools", [])
            logger.info(f"Loaded {len(tools)} tools from {entry}")
            all_tools.extend(tools)
        except ImportError:
            pass  # No tools.py in this example

    return all_tools


# Load all tools from all examples
example_tools = load_all_example_tools()
logger.info(f"Total: {len(example_tools)} tools loaded from all examples")


@tool
def get_current_time() -> str:
    """Get the current server time."""
    from datetime import datetime

    return datetime.now().isoformat()


# Tool registry: all example tools + skeleton tool
all_tools = example_tools + [get_current_time]
