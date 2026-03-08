# ═══════════════════════════════════════════════════════════
# Course Builder Agent — generates interactive JSX simulations
#
# Architecture:
#   Backend tools write to state["files"] directly.
#   copilotkit_emit_state pushes file changes to frontend in real-time.
#   Frontend useCoAgent reads state.files reactively → feeds to Sandpack.
#
#   No CopilotKit actions needed. Pure state sync.
#
# Graph: chat_node ←→ tool_executor (ReAct loop)
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

import json
from typing import Any, Literal

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver


# ── System Prompts per Format ────────────────────────────

BASE_SYSTEM = """You are an expert educational interaction designer and React developer.
You help teachers create interactive science lessons for Chinese elementary school children (ages 6-12).

RULES:
- The JSX must work in Sandpack with React + framer-motion available
- Use only inline styles — no CSS imports, no Tailwind (Sandpack doesn't have it)
- All state is local (useState, useRef, useEffect)
- Touch-friendly: all interactive elements 48px+ hit targets
- Keep the code clean, well-commented, age-appropriate visuals
- Use bright, playful colors suitable for children
- Chinese text is fine for labels if the teacher requests it

TOOLS:
- write_file: Create or fully replace a file. Use for initial creation or major rewrites.
- update_file: Replace a specific text section in an existing file. Use for targeted edits.

You ALWAYS write to "/App.jsx" as the main component file.
You may also write "/interactions.json" for event-reaction mappings.

IMPORTANT: At the start of a conversation, do NOT immediately generate code.
First understand what the teacher wants. Ask 1-2 clarifying questions if the
request is vague (age range, specific concepts to cover, interaction style).
Only generate code once you have enough context."""

LAB_PROMPT = """
FORMAT: Interactive Lab Simulation

You are building an interactive lab/simulation where students manipulate variables
and observe outcomes visually. Think: sliders, drag-and-drop, animated state changes.

The component receives one prop: `onEvent` — a callback for meaningful interactions.
Call onEvent({ type, data }) for moments like:
- phase_change, milestone, dwell_timeout, first_interaction, experiment_complete

Structure:
- A visual simulation area (the "lab bench") taking ~60% of space
- Controls panel with sliders, buttons, toggles
- A small status/info panel showing current state

Use requestAnimationFrame or useEffect timers for animations.
Use vibrant gradients and rounded shapes — make it feel like a real kids' science app."""

QUIZ_PROMPT = """
FORMAT: Interactive Quiz

You are building a quiz/assessment where students answer questions and get
immediate feedback. Think: multiple choice, drag-to-match, fill-in-the-blank.

Structure:
- Question display area with large, readable text
- Answer options as large tappable buttons (min 48px height)
- Progress indicator (e.g., "Question 3 of 10")
- Score tracker
- Feedback animation on correct/incorrect (confetti for correct, gentle shake for wrong)
- Summary screen at the end with score and encouragement

Include at least 5 questions. Each question should have 3-4 options.
Make wrong-answer feedback educational, not punitive — explain why the correct answer is right."""

DIALOGUE_PROMPT = """
FORMAT: Interactive Dialogue / Story

You are building a conversational/narrative experience where students interact
with characters and make choices that affect the story.

Structure:
- Character display area with simple avatar/illustration (use emoji or CSS art)
- Speech bubbles for character dialogue
- Choice buttons for student responses (2-3 options per turn)
- Branching paths based on choices
- A progress/chapter indicator

Make characters warm and encouraging. Use a storytelling approach to teach concepts.
Each dialogue branch should teach something different about the topic."""


# ── Tools (modify state directly) ────────────────────────

@tool
def write_file(path: str, content: str) -> str:
    """Write or overwrite a file in the sandbox environment.
    Use this to create or fully replace files.

    Args:
        path: File path starting with / (e.g., /App.jsx, /interactions.json)
        content: The full file content to write.
    """
    # Actual state mutation happens in tool_executor node
    return json.dumps({"action": "write", "path": path, "content": content})


@tool
def update_file(path: str, old_text: str, new_text: str) -> str:
    """Replace a specific section of text in an existing file.
    Use this for targeted edits instead of rewriting the entire file.

    Args:
        path: File path to edit (e.g., /App.jsx)
        old_text: The exact text to find and replace (must be unique in file)
        new_text: The replacement text
    """
    return json.dumps({"action": "update", "path": path, "old_text": old_text, "new_text": new_text})


TOOLS = [write_file, update_file]


# ── Agent State ──────────────────────────────────────────

class CourseBuilderState(CopilotKitState):
    """Course builder agent state.
    CopilotKitState provides: messages, copilotkit (actions + context).
    """
    files: dict[str, str]


# ── Graph Nodes ──────────────────────────────────────────

async def chat_node(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Main conversational node. Sends messages to LLM with tools bound."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    print(f"[Agent:chat_node] Received {len(state['messages'])} messages")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=1.0,
        max_retries=2,
    )

    model_with_tools = llm.bind_tools(TOOLS)

    # Detect format from conversation context to pick the right prompt
    format_prompt = _detect_format_prompt(state["messages"])
    detected_format = "lab" if "lab" in format_prompt.lower() else "quiz" if "quiz" in format_prompt.lower() else "dialogue"
    print(f"[Agent:chat_node] Detected format: {detected_format}")

    system = SystemMessage(content=BASE_SYSTEM + format_prompt)

    response = await model_with_tools.ainvoke(
        [system, *state["messages"]],
        config,
    )

    has_tool_calls = hasattr(response, 'tool_calls') and response.tool_calls
    print(f"[Agent:chat_node] LLM response: tool_calls={has_tool_calls}, content_length={len(getattr(response, 'content', ''))}")

    return {"messages": [response]}


async def tool_executor(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Execute tool calls: mutate state.files and emit to frontend."""
    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage) or not last_message.tool_calls:
        return {}

    print(f"[Agent:tool_executor] Executing {len(last_message.tool_calls)} tool calls")

    files = dict(state.get("files") or {})
    tool_results = []

    for tc in last_message.tool_calls:
        name = tc["name"]
        args = tc["args"]
        tool_call_id = tc["id"]

        if name == "write_file":
            path = args.get("path", "/App.jsx")
            content = args.get("content", "")
            files[path] = content
            result = f"Wrote {path} ({len(content)} chars)"
            print(f"[Agent:tool_executor] write_file: {path} ({len(content)} chars)")

        elif name == "update_file":
            path = args.get("path", "/App.jsx")
            old_text = args.get("old_text", "")
            new_text = args.get("new_text", "")
            current = files.get(path, "")
            if old_text in current:
                files[path] = current.replace(old_text, new_text, 1)
                result = f"Updated {path}"
                print(f"[Agent:tool_executor] update_file: {path} (replaced {len(old_text)} → {len(new_text)} chars)")
            else:
                result = f"Error: could not find the specified text in {path}"
                print(f"[Agent:tool_executor] update_file ERROR: text not found in {path}")
        else:
            result = f"Unknown tool: {name}"
            print(f"[Agent:tool_executor] Unknown tool: {name}")

        tool_results.append(
            ToolMessage(content=result, tool_call_id=tool_call_id)
        )

    # Push file changes to frontend immediately
    print(f"[Agent:tool_executor] Emitting state: {len(files)} files, total size: {sum(len(c) for c in files.values())} chars")
    await copilotkit_emit_state(config, {"files": files})
    print(f"[Agent:tool_executor] State emitted successfully")

    return {"files": files, "messages": tool_results}


def should_continue(state: CourseBuilderState) -> str:
    """Route: if last message has tool_calls → tool_executor, else → END."""
    last = state["messages"][-1] if state["messages"] else None
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tool_executor"
    return END


# ── Helpers ──────────────────────────────────────────────

def _detect_format_prompt(messages: list) -> str:
    """Scan conversation for format keywords to select the right system prompt."""
    text = " ".join(
        getattr(m, "content", "") for m in messages
        if hasattr(m, "content") and isinstance(getattr(m, "content", ""), str)
    ).lower()

    if "quiz" in text or "assessment" in text or "test" in text:
        return QUIZ_PROMPT
    elif "dialogue" in text or "story" in text or "narrative" in text or "conversation" in text:
        return DIALOGUE_PROMPT
    else:
        # Default to lab
        return LAB_PROMPT


# ── Graph Builder ────────────────────────────────────────

def build_course_builder_graph():
    """Build the course builder StateGraph with ReAct tool loop."""

    graph = StateGraph(CourseBuilderState)

    graph.add_node("chat_node", chat_node)
    graph.add_node("tool_executor", tool_executor)

    graph.add_edge(START, "chat_node")
    graph.add_conditional_edges("chat_node", should_continue, {
        "tool_executor": "tool_executor",
        END: END,
    })
    graph.add_edge("tool_executor", "chat_node")

    return graph.compile(checkpointer=MemorySaver())
