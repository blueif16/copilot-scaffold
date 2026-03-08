# ═══════════════════════════════════════════════════════════
# Course Builder Agent — generates interactive JSX simulations
#
# Trigger: Teacher chat messages in course builder UI
# Flow:    Single conversational_code_generation node (ReAct pattern)
#
# Uses Gemini 3.1 Pro for high-quality code generation.
# Implements write_file and update_file tools for JSX editing.
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

from typing import Any

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state
from langchain_core.messages import SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command


# ── System Prompt ────────────────────────────────────────

COURSE_BUILDER_SYSTEM = """You are an expert educational interaction designer and React developer.
You help teachers create interactive science lessons for children.

You have two tools:
- write_file: Create or fully replace a file
- update_file: Make targeted edits to an existing file

You work with two files:
1. Simulation.jsx — A single-file React component that IS the interactive lesson.
   It receives one prop: `onEvent` — a callback you call when meaningful interactions happen.
   It must be fully self-contained (inline styles or Tailwind, no external imports except React and framer-motion).

2. interactions.json — Defines what the AI companion says/does in response to events.
   Format:
   {
     "topic": "water-cycle",
     "companion": { "name": "Nimbus", "personality": "friendly cloud" },
     "events": [
       {
         "id": "unique_id",
         "trigger": { "type": "event_type", "conditions": {} },
         "reaction": {
           "message": "What the companion says",
           "emotion": "excited|curious|impressed|celebrating|encouraging",
           "oneShot": true,
           "autoExpireMs": 4000
         }
       }
     ]
   }

RULES:
- The JSX must work in Sandpack with React + framer-motion + Tailwind CDN
- Use only inline styles or Tailwind classes — no CSS imports
- All state is local (useState, useRef)
- Touch-friendly: all interactive elements 48px+ hit targets
- Call onEvent({ type, data }) for meaningful moments:
  phase_change, milestone, dwell_timeout, first_interaction, etc.
- Keep the code clean, well-commented, age-appropriate visuals
- When the teacher asks for changes, prefer update_file for small edits
- Use write_file only for initial creation or major rewrites
- Always respond conversationally AND make tool calls — explain what you're doing

IMPORTANT: At the start of a conversation, do NOT immediately generate code.
First, understand what the teacher wants. Ask 1-2 clarifying questions if the
request is vague (age range, specific concepts to cover, interaction style).
Only generate code once you have enough context to make something good."""


# ── Tools ────────────────────────────────────────────────


@tool
def write_file(filename: str, content: str) -> str:
    """Write or overwrite a file in the sandbox environment.
    Use this to create or fully replace the simulation JSX or interactions JSON.

    Args:
        filename: The file to write. Must be one of:
            - "Simulation.jsx" — The main interactive component
            - "interactions.json" — Event→Reaction mappings
        content: The full file content to write.
    """
    # The actual file write happens on the frontend via state emission.
    # This tool returns the content so the frontend can update Sandpack.
    return f"OK: wrote {filename} ({len(content)} chars)"


@tool
def update_file(filename: str, old_text: str, new_text: str) -> str:
    """Replace a specific section of text in a file.
    Use this for targeted edits instead of rewriting the entire file.

    Args:
        filename: The file to edit ("Simulation.jsx" or "interactions.json")
        old_text: The exact text to find and replace (must be unique in file)
        new_text: The replacement text
    """
    return f"OK: updated {filename}, replaced {len(old_text)} chars with {len(new_text)} chars"


# ── Agent State ──────────────────────────────────────────


class CourseBuilderState(CopilotKitState):
    """Course builder agent state. CopilotKitState provides messages + copilotkit."""

    # Files being edited (tracked for frontend sync)
    files: dict[str, str]

    # Required by create_react_agent
    remaining_steps: int = 25


# ── Graph Builder ────────────────────────────────────────


def build_course_builder_graph():
    """Build the course builder ReAct agent graph."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    # Create LLM with Gemini 3.1 Pro
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-pro-preview",
        temperature=1.0,  # Gemini 3+ default; good for creative code gen
        max_retries=2,
    )

    # Bind tools to the model
    tools = [write_file, update_file]

    # Create ReAct agent using LangGraph prebuilt
    react_agent = create_react_agent(
        model=llm,
        tools=tools,
        state_schema=CourseBuilderState,
        prompt=COURSE_BUILDER_SYSTEM,
    )

    return react_agent
