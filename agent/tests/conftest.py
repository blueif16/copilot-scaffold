"""Conftest — add agent root to sys.path for test imports."""

import sys
from pathlib import Path

# Ensure agent/ is importable as a top-level package root
_agent_root = str(Path(__file__).resolve().parent.parent)
if _agent_root not in sys.path:
    sys.path.insert(0, _agent_root)
