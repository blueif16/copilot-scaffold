"""
Letta memory management for student agents.

This module provides functions to create and manage Letta agents
that maintain self-editing memory about each student's learning
profile, style, knowledge state, and interests.
"""

from .letta_client import (
    get_letta_client,
    create_student_agent,
    get_student_memory,
    update_student_memory_after_session,
)

__all__ = [
    "get_letta_client",
    "create_student_agent",
    "get_student_memory",
    "update_student_memory_after_session",
]
