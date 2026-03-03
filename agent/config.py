# ═══════════════════════════════════════════════════════════
# Agent Configuration — Environment & Path Resolution
#
# Handles .env loading with worktree awareness so the agent
# works both from the main repo and from git worktrees.
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

import os
from pathlib import Path


def _find_env_file() -> Path | None:
    """Locate the .env file, searching upward from the agent directory.

    Works in both normal repos and git worktrees by walking up
    until we find a .env file or hit the filesystem root.
    """
    current = Path(__file__).resolve().parent
    for _ in range(10):  # safety limit
        candidate = current / ".env"
        if candidate.is_file():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def load_env() -> None:
    """Load environment variables from the nearest .env file.

    Does NOT override variables that are already set in the
    environment (e.g. from Docker, CI, or shell exports).
    """
    env_path = _find_env_file()
    if env_path is None:
        return

    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = value


def get_google_api_key() -> str:
    """Return the Google API key, raising a clear error if missing."""
    key = os.environ.get("GOOGLE_API_KEY", "")
    if not key:
        raise EnvironmentError(
            "GOOGLE_API_KEY is not set. "
            "Copy .env.example to .env and add your key, or export it."
        )
    return key
