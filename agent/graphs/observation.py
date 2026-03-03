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
from typing import Any, Literal

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

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
    _pending_reaction: dict[str, Any] | None
    _ai_hint: str | None
    _event_counts: dict[str, int]


# ── Graph Builder ────────────────────────────────────────


def build_observation_graph(
    topic_config: TopicConfig,
    reaction_registry: ReactionRegistry,
):
    """Build the observation agent graph.

    TopicConfig and ReactionRegistry are captured by closure —
    they never appear in graph state.
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

        hint = state.get("_ai_hint") or ""

        # topic_config accessed via closure
        prompt = f"""{topic_config.pedagogical_prompt}

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
        model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
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

    async def deliver_reaction(
        state: ObservationAgentState, config: RunnableConfig
    ) -> dict:
        """Write the reaction to companion state and emit immediately."""
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

    return graph.compile()
