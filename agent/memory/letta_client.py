"""
Letta client for student memory management.

Provides functions to create student agents with self-editing memory blocks,
retrieve memory for injection into companion prompts, and update memory
after learning sessions.
"""

import os
from typing import Optional
from letta_client import Letta


def get_letta_client() -> Letta:
    """
    Get Letta client for self-hosted server.

    Returns:
        Letta: Configured Letta client connected to self-hosted server

    Raises:
        ValueError: If LETTA_BASE_URL environment variable is not set
    """
    base_url: Optional[str] = os.environ.get("LETTA_BASE_URL")

    if not base_url:
        raise ValueError(
            "LETTA_BASE_URL environment variable is not set. "
            "Please configure it in your .env file."
        )

    return Letta(base_url=base_url)


def create_student_agent(student_id: str, name: str, age: int) -> str:
    """
    Create a Letta agent for a new student with initial memory blocks.

    The agent is created with four memory blocks:
    - student_profile: Basic demographic information
    - learning_style: Preferences and interaction patterns (initially empty)
    - knowledge_state: Mastered topics and misconceptions (initially empty)
    - interests: Topics that excite the student (initially empty)

    Args:
        student_id: Unique identifier for the student
        name: Student's name
        age: Student's age

    Returns:
        str: The created agent's ID

    Raises:
        ValueError: If LETTA_BASE_URL is not configured
        ApiError: If agent creation fails
    """
    client = get_letta_client()

    agent = client.agents.create(
        name=f"student-{student_id}",
        model="google/gemini-2.5-flash",  # Cheaper model for memory management
        embedding="openai/text-embedding-3-small",
        memory_blocks=[
            {
                "label": "student_profile",
                "value": f"Name: {name}. Age: {age}. New student, no history yet.",
            },
            {
                "label": "learning_style",
                "value": "No data yet. Observe how the student interacts to determine their learning preferences.",
            },
            {
                "label": "knowledge_state",
                "value": "No topics completed yet. No known misconceptions.",
            },
            {
                "label": "interests",
                "value": "No known interests yet. Pay attention to what excites the student.",
            },
        ],
        enable_sleeptime=True,  # Background memory processing
        description=f"Memory agent for student {name}",
    )

    return agent.id


def get_student_memory(agent_id: str) -> dict:
    """
    Read all memory blocks for injection into companion prompts.

    Retrieves the four core memory blocks that contain the agent's
    learned knowledge about the student.

    Args:
        agent_id: The Letta agent ID for the student

    Returns:
        dict: Memory blocks with keys: student_profile, learning_style,
              knowledge_state, interests. Each value is a string.

    Raises:
        ValueError: If LETTA_BASE_URL is not configured
        ApiError: If memory retrieval fails
    """
    client = get_letta_client()
    memory = {}

    for label in ["student_profile", "learning_style", "knowledge_state", "interests"]:
        block = client.agents.blocks.retrieve(agent_id=agent_id, block_label=label)
        memory[label] = block.value

    return memory


def update_student_memory_after_session(
    agent_id: str,
    session_summary: str,
    topic: str,
    duration_minutes: int,
) -> None:
    """
    Send session data to Letta agent for self-editing memory update.

    The Letta agent processes the session summary and autonomously
    decides what to update in its memory blocks based on observed
    patterns, mastery, misconceptions, and interests.

    Args:
        agent_id: The Letta agent ID for the student
        session_summary: Summary of what happened during the session
        topic: The topic covered in the session
        duration_minutes: How long the session lasted

    Raises:
        ValueError: If LETTA_BASE_URL is not configured
        ApiError: If message sending fails
    """
    client = get_letta_client()

    # The Letta agent processes this message and autonomously
    # decides what to update in its memory blocks
    client.agents.messages.create(
        agent_id=agent_id,
        messages=[
            {
                "role": "user",
                "content": (
                    f"SESSION COMPLETE — Topic: {topic}, Duration: {duration_minutes}min\n\n"
                    f"Session Summary:\n{session_summary}\n\n"
                    "Please update the student's memory blocks based on this session. "
                    "Update learning_style if you noticed patterns. "
                    "Update knowledge_state with new mastery or misconceptions. "
                    "Update interests if the student showed excitement about specific topics."
                ),
            }
        ],
    )
