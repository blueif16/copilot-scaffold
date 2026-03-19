# Examples package — aggregates tools from all example apps.
# The skeleton imports from here to get all widget tools.
#
# Usage in backend/agent/tools.py:
#   from examples import load_example_tools
#   example_tools = load_example_tools()

import importlib
import logging
from typing import List
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


def load_example_tools() -> List[BaseTool]:
    """
    Load all tools from all example apps.
    Each example should have a tools.py with an `all_tools` list.
    """
    all_tools: List[BaseTool] = []

    # List of example modules to load tools from
    # Add new examples here as they're created
    example_modules = [
        "examples.student_dashboard",
        # "examples.science_lab",  # Uncomment when tools.py is added
    ]

    for module_name in example_modules:
        try:
            module = importlib.import_module(f"{module_name}.tools")
            tools = getattr(module, "all_tools", [])
            example_name = module_name.split(".")[-1]
            logger.info(f"Loaded {len(tools)} tools from {example_name}")
            all_tools.extend(tools)
        except ImportError as e:
            logger.warning(f"Could not load tools from {module_name}: {e}")
        except AttributeError:
            logger.warning(f"{module_name} has no all_tools attribute, skipping")

    return all_tools


__all__ = ["load_example_tools"]
