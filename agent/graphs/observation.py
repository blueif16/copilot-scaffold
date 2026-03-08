# ═══════════════════════════════════════════════════════════
# Observation Agent — processes simulation events (§5.4)
#
# Trigger: useCopilotAction "processSimulationEvent"
# Flow:    event_classifier → reaction_lookup → [ai_reasoning] → deliver_reaction
#
# TopicConfig and ReactionRegistry are captured by closure —
# they NEVER appear in graph state.
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

import time
from typing import Any, Literal, Optional, Callable

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command
from langgraph.checkpoint.memory import MemorySaver

from models import (
    BaseAnimation,
    BaseEmotion,
    ReactionRegistry,
    SimulationEvent,
    TopicConfig,
    make_emit_reaction_tool,
)


# ── Agent State ──────────────────────────────────────────
# Extends CopilotKitState which provides `messages` and
# `copilotkit` (actions + context). Only data that needs to
# sync with the frontend belongs here.


class ObservationAgentState(CopilotKitState):
    """State synced with frontend via useCoAgent. No config objects here."""

    simulation: dict[str, Any]
    events: dict[str, Any]
    companion: dict[str, Any]
    # Internal routing fields (small, transient)
    _pending_reaction: Optional[dict[str, Any]]
    _ai_hint: Optional[str]
    _event_counts: dict[str, int]


# ── Graph Builder ────────────────────────────────────────


def build_observation_graph(
    topic_config: TopicConfig,
    reaction_registry: ReactionRegistry,
    memory_fetcher: Optional[Callable[[str], dict]] = None,
):
    """Build the observation agent graph.

    TopicConfig and ReactionRegistry are captured by closure —
    they never appear in graph state.

    Args:
        topic_config: Topic-specific configuration
        reaction_registry: Registry of programmed reactions
        memory_fetcher: Optional callable that returns student memory dict.
                       Called per-request with user_id from config.
                       Signature: (user_id: str) -> dict
    """

    # Pre-compute allowed emotions/animations for the AI tool
    all_emotions = [e.value for e in BaseEmotion] + list(topic_config.extra_emotions)
    all_animations = [a.value for a in BaseAnimation] + list(
        topic_config.extra_animations
    )

    # ── Nodes ────────────────────────────────────────────

    def event_classifier(state: ObservationAgentState) -> dict:
        """Classify the incoming event and update event counts."""
        event = state.get("events", {}).get("latest")
        if not event:
            return {}

        event_type = event.get("type", "")
        counts = dict(state.get("_event_counts") or {})
        counts[event_type] = counts.get(event_type, 0) + 1

        # Enrich event data with occurrence count
        enriched_events = dict(state["events"])
        enriched_latest = dict(enriched_events.get("latest") or {})
        enriched_data = dict(enriched_latest.get("data") or {})
        enriched_data["times_seen"] = counts[event_type]
        enriched_latest["data"] = enriched_data
        enriched_events["latest"] = enriched_latest

        return {"_event_counts": counts, "events": enriched_events}

    def reaction_lookup(
        state: ObservationAgentState,
    ) -> Command[Literal["ai_reasoning", "deliver_reaction"]]:
        """Look up programmed reaction. Route via Command."""
        event = (state.get("events") or {}).get("latest")
        if not event:
            return Command(
                goto="deliver_reaction", update={"_pending_reaction": None}
            )

        sim_event = SimulationEvent(
            type=event.get("type", ""),
            timestamp=event.get("timestamp", 0),
            data=event.get("data", {}),
        )

        # Build context from simulation state + companion progress
        context = {
            **state.get("simulation", {}),
            **state.get("companion", {}).get("progress", {}),
            "times_seen": event.get("data", {}).get("times_seen", 1),
            "reaction_history": state.get("companion", {}).get(
                "reactionHistory", []
            ),
        }

        # Registry accessed via closure (never from state)
        reaction, needs_ai = reaction_registry.lookup(sim_event, context)

        if not needs_ai and reaction:
            payload = reaction.response
            payload.reaction_id = reaction.id
            payload.timestamp = time.time()
            return Command(
                goto="deliver_reaction",
                update={"_pending_reaction": payload.__dict__},
            )
        else:
            hint = reaction.ai_hint if reaction else None
            return Command(
                goto="ai_reasoning",
                update={
                    "_ai_hint": hint,
                    "_pending_reaction": None,
                },
            )

    async def ai_reasoning(
        state: ObservationAgentState, config: RunnableConfig
    ) -> dict:
        """LLM decides what the companion should do.

        Uses Gemini 2.5 Flash for fast, cost-effective reasoning.
        """
        from langchain_google_genai import ChatGoogleGenerativeAI

        try:
            hint = state.get("_ai_hint") or ""

            # Fetch memory per-request if memory_fetcher provided
            memory_context = ""
            if memory_fetcher:
                try:
                    # Extract user_id from config (passed by CopilotKit middleware)
                    user_id = config.get("configurable", {}).get("user_id")
                    if user_id:
                        student_memory = memory_fetcher(user_id)
                        if student_memory:
                            memory_context = f"""
STUDENT MEMORY (from past sessions):
- Profile: {student_memory.get('student_profile', 'N/A')}
- Learning Style: {student_memory.get('learning_style', 'N/A')}
- Knowledge: {student_memory.get('knowledge_state', 'N/A')}
- Interests: {student_memory.get('interests', 'N/A')}
"""
                except Exception as e:
                    print(f"Failed to fetch student memory: {e}")
                    # Continue without memory - don't block the request

            # topic_config accessed via closure
            prompt = f"""{topic_config.pedagogical_prompt}
{memory_context}
CURRENT SIMULATION STATE:
{state.get("simulation", {})}

EVENT THAT TRIGGERED THIS:
{(state.get("events") or {}).get("latest")}

REACTIONS ALREADY SHOWN:
{state.get("companion", {}).get("reactionHistory", [])}

ADDITIONAL CONTEXT:
{hint}

Decide if the companion should react. If yes, call the emit_reaction tool.
If the moment doesn't warrant a reaction, do nothing."""

            tool = make_emit_reaction_tool(all_emotions, all_animations)
            model = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", temperature=0.7)
            model_with_tool = model.bind_tools([tool])

            response = await model_with_tool.ainvoke(
                [SystemMessage(content=prompt)], config
            )

            # Extract tool call result if present
            if hasattr(response, "tool_calls") and response.tool_calls:
                tool_call = response.tool_calls[0]
                payload = tool_call.get("args", {})
                payload["source"] = "ai"
                payload["reaction_id"] = f"ai-{int(time.time())}"
                payload["timestamp"] = time.time()
                return {"_pending_reaction": payload}

            return {"_pending_reaction": None}

        except Exception as e:
            # Log error but don't propagate - prevents RUN_ERROR terminal state
            print(f"AI reasoning failed: {e}")
            return {"_pending_reaction": None}

    async def deliver_reaction(
        state: ObservationAgentState, config: RunnableConfig
    ) -> dict:
        """Write the reaction to companion state and emit immediately."""
        try:
            pending = state.get("_pending_reaction")
            if not pending:
                return {}

            companion = dict(state.get("companion") or {})
            companion["currentReaction"] = pending
            companion["reactionHistory"] = companion.get("reactionHistory", []) + [
                pending.get("reaction_id", "")
            ]

            if pending.get("progress_update"):
                progress = dict(companion.get("progress", {}))
                progress.update(pending["progress_update"])
                companion["progress"] = progress

            if pending.get("unlock_spotlight"):
                companion["spotlightUnlocked"] = True

            # Push to frontend IMMEDIATELY — don't wait for node completion
            await copilotkit_emit_state(config, {"companion": companion})

            return {"companion": companion}

        except Exception as e:
            # Log error but don't propagate - prevents RUN_ERROR terminal state
            print(f"Deliver reaction failed: {e}")
            return {}

    # ── Assemble the graph ───────────────────────────────

    graph = StateGraph(ObservationAgentState)

    graph.add_node("event_classifier", event_classifier)
    graph.add_node("reaction_lookup", reaction_lookup)
    graph.add_node("ai_reasoning", ai_reasoning)
    graph.add_node("deliver_reaction", deliver_reaction)

    graph.add_edge(START, "event_classifier")
    graph.add_edge("event_classifier", "reaction_lookup")
    # reaction_lookup uses Command for routing — NO conditional edges here
    graph.add_edge("ai_reasoning", "deliver_reaction")
    graph.add_edge("deliver_reaction", END)

    return graph.compile(checkpointer=MemorySaver())
