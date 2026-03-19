# Examples package — aggregates tools from ALL example apps automatically.
# The skeleton imports from here to get all widget tools.
#
# Usage in backend/agent/tools.py:
#   from examples import load_all_example_tools
#   all_tools = load_all_example_tools() + [get_current_time]

import importlib
import logging
import os
from typing import List
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


def load_all_example_tools() -> List[BaseTool]:
    """
    Auto-discover and load ALL tools from ALL example apps.
    Scans the examples directory for modules with tools.py.
    """
    all_tools: List[BaseTool] = []

    examples_dir = os.path.dirname(os.path.abspath(__file__))

    for entry in os.listdir(examples_dir):
        example_path = os.path.join(examples_dir, entry)

        # Skip non-directories and special dirs
        if not os.path.isdir(example_path):
            continue
        if entry.startswith("_") or entry.startswith("."):
            continue

        # Try to load tools from this example
        module_name = f"examples.{entry}"

        try:
            # Convert hyphenated names to underscores for Python import
            module_name_underscore = module_name.replace("-", "_")
            module = importlib.import_module(f"{module_name_underscore}.tools")
            tools = getattr(module, "all_tools", [])

            logger.info(f"Loaded {len(tools)} tools from {entry}")
            all_tools.extend(tools)
        except ImportError as e:
            # No tools.py in this example — that's fine
            logger.debug(f"No tools in {entry}: {e}")
        except AttributeError:
            logger.warning(f"{entry} has no all_tools attribute, skipping")
        except Exception as e:
            logger.warning(f"Error loading {entry}: {e}")

    logger.info(f"Total: {len(all_tools)} tools loaded from all examples")
    return all_tools


__all__ = ["load_all_example_tools"]
