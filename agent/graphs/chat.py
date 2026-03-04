# ═══════════════════════════════════════════════════════════
# Chat Agent — answers questions in context (§5.4)
#
# Trigger: useCopilotChat messages
# Flow:    Single conversational_response node
#
# Uses Gemini 2.5 Flash Lite for fast, cheap child-facing chat.
# TopicConfig is captured by closure — never in graph state.
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

from typing import Any

from copilotkit import CopilotKitState
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command
from langgraph.checkpoint.memory import MemorySaver

from models import TopicConfig


# ── Agent State ──────────────────────────────────────────


def format_recent_events(history: list[dict], max_events: int = 5) -> str:
    """Format last N events. Events are pre-filtered by frontend."""
    if not history:
        return "No recent activity"

    recent = history[-max_events:]
    lines = []

    for event in recent:
        event_type = event.get("type", "")
        data = event.get("data", {})

        if event_type == "phase_change":
            lines.append(f"• Transitioned from {data.get('from')} to {data.get('to')}")
        elif event_type == "dwell_timeout":
            lines.append(f"• Observed {data.get('phase')} phase for {data.get('seconds')}s")
        elif event_type == "reversal":
            lines.append(f"• Changed direction (was {data.get('previousDirection')})")
        elif event_type == "rapid_cycling":
            lines.append(f"• Rapidly exploring ({data.get('transitionsInWindow')} transitions)")
        elif event_type == "milestone":
            lines.append(f"• Discovered all three phases!")
        elif event_type == "first_interaction":
            lines.append(f"• Started exploring")
        elif event_type == "idle_timeout":
            lines.append(f"• Paused for {data.get('seconds')}s")
        elif event_type == "spotlight_tap":
            lines.append(f"• Engaged with spotlight content")

    return "\n".join(lines) if lines else "No recent activity"


class ChatAgentState(CopilotKitState):
    """Chat agent state. CopilotKitState provides messages + copilotkit."""

    simulation: dict[str, Any]
    companion: dict[str, Any]
    events: dict[str, Any]


# ── Graph Builder ────────────────────────────────────────


def build_chat_graph(topic_config: TopicConfig):
    """Build the chat agent graph. TopicConfig injected via closure."""

    async def conversational_response(
        state: ChatAgentState, config: RunnableConfig
    ) -> Command:
        """Generate chat response using LLM with full simulation context."""
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import AIMessage

        print(f"[Chat Agent] Received state with {len(state.get('messages', []))} messages")
        print(f"[Chat Agent] Simulation state: {state.get('simulation', {})}")
        print(f"[Chat Agent] Companion progress: {state.get('companion', {}).get('progress', {})}")

        try:
            # topic_config accessed via closure
            sim = state.get("simulation", {})
            system_msg = f"""{topic_config.chat_system_prompt}

CURRENT STATE:
Phase: {sim.get("phase")}
Temperature: {sim.get("temperature")}

RECENT ACTIVITY:
{format_recent_events(state.get("events", {}).get("history", []))}

STUDENT PROGRESS:
{state.get("companion", {}).get("progress", {})}

REACTIONS ALREADY SHOWN (don't repeat these):
{state.get("companion", {}).get("reactionHistory", [])}

TOPIC KNOWLEDGE:
{topic_config.knowledge_context}"""

            print(f"[Chat Agent] System prompt:\n{system_msg}\n")
            print(f"[Chat Agent] User message: {state['messages'][-1].content if state.get('messages') else 'None'}\n")

            model = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.7,
            )

            response = await model.ainvoke(
                [SystemMessage(content=system_msg), *state["messages"]],
                config,
            )

            print(f"[Chat Agent] Generated response: {response.content[:100]}")

            return Command(goto=END, update={"messages": [response]})

        except Exception as e:
            # Log error but return fallback response - prevents RUN_ERROR terminal state
            print(f"Chat response failed: {e}")
            fallback = AIMessage(
                content="I'm having trouble right now. Could you try asking again?"
            )
            return Command(goto=END, update={"messages": [fallback]})

    # ── Assemble the graph ───────────────────────────────

    graph = StateGraph(ChatAgentState)
    graph.add_node("respond", conversational_response)
    graph.add_edge(START, "respond")

    return graph.compile(checkpointer=MemorySaver())
