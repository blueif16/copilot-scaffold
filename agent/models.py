# ═══════════════════════════════════════════════════════════
# UNIVERSAL TYPES — shared across ALL topics
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal, Optional


# ── Emotion & Animation ─────────────────────────────────


class BaseEmotion(str, Enum):
    IDLE = "idle"
    EXCITED = "excited"
    CURIOUS = "curious"
    IMPRESSED = "impressed"
    CELEBRATING = "celebrating"
    THINKING = "thinking"
    ENCOURAGING = "encouraging"
    WATCHING = "watching"


class BaseAnimation(str, Enum):
    BOUNCE = "bounce"
    NOD = "nod"
    TILT_HEAD = "tilt_head"
    CONFETTI = "confetti"
    WAVE = "wave"
    POINT = "point"
    NONE = "none"


# ── Events ──────────────────────────────────────────────


@dataclass
class SimulationEvent:
    type: str
    timestamp: float
    data: dict[str, Any] = field(default_factory=dict)


# ── Reaction System ─────────────────────────────────────


@dataclass
class EventPattern:
    """Defines when a reaction should trigger.

    Condition keys support suffixes:
      "field"      → exact match
      "field__gte" → greater than or equal
      "field__lte" → less than or equal
      "field__in"  → value in list
    """

    event: str  # Event type to match, or "*"
    conditions: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReactionPayload:
    """The universal reaction format.

    Frontend renders this regardless of source (programmed or AI).
    """

    # Content
    message: Optional[str] = None
    suggestions: Optional[list[str]] = None

    # Companion behavior
    emotion: str = "idle"
    animation: Optional[str] = None
    sound: Optional[str] = None

    # Display control
    type: Literal["observation", "suggestion", "milestone", "prompt"] = "observation"
    priority: int = 5
    auto_expire_ms: int = 4000

    # Special triggers
    unlock_spotlight: bool = False
    progress_update: Optional[dict[str, Any]] = None

    # Metadata (not rendered)
    source: Literal["programmed", "ai"] = "programmed"
    reaction_id: str = ""
    timestamp: float = 0.0


@dataclass
class Reaction:
    """A single programmed reaction: trigger pattern → response."""

    id: str
    trigger: EventPattern
    response: ReactionPayload
    cooldown_seconds: Optional[float] = None
    one_shot: bool = False
    escalate_to_ai: bool = False
    ai_hint: Optional[str] = None


class ReactionRegistry:
    """Collection of programmed reactions for a topic.

    Cooldowns use event timestamps from state (not wall-clock time)
    so behavior is consistent even if the graph is replayed via checkpointing.
    """

    def __init__(self, topic_id: str, reactions: list[Reaction]):
        self.topic_id = topic_id
        self.reactions = reactions
        self._fired: dict[str, float] = {}  # reaction_id → last fired timestamp

    def lookup(
        self,
        event: SimulationEvent,
        context: dict[str, Any],
    ) -> tuple[Optional[Reaction], bool]:
        """Find the highest-priority matching reaction.

        Returns (reaction, needs_ai):
        - No match           → (None, True)  — escalate to AI
        - Match + escalate   → (reaction, True) — AI gets the hint
        - Match, no escalate → (reaction, False) — use programmed response
        """
        matches: list[Reaction] = []

        for reaction in self.reactions:
            if self._is_on_cooldown(reaction, event.timestamp):
                continue
            if reaction.one_shot and reaction.id in self._fired:
                continue
            if self._matches(reaction.trigger, event, context):
                matches.append(reaction)

        if not matches:
            return (None, True)

        best = max(matches, key=lambda r: r.response.priority)
        self._fired[best.id] = event.timestamp

        if best.escalate_to_ai:
            return (best, True)

        return (best, False)

    def _matches(
        self, pattern: EventPattern, event: SimulationEvent, context: dict[str, Any]
    ) -> bool:
        if pattern.event != "*" and pattern.event != event.type:
            return False

        for key, expected in pattern.conditions.items():
            if "__" in key:
                field_name, op = key.rsplit("__", 1)
            else:
                field_name, op = key, "eq"

            actual = event.data.get(field_name, context.get(field_name))
            if actual is None:
                return False

            if op == "eq" and actual != expected:
                return False
            if op == "gte" and actual < expected:
                return False
            if op == "lte" and actual > expected:
                return False
            if op == "in" and actual not in expected:
                return False

        return True

    def _is_on_cooldown(self, reaction: Reaction, current_timestamp: float) -> bool:
        """Uses event timestamps, not wall-clock time, for checkpoint safety."""
        if reaction.cooldown_seconds is None:
            return False
        last = self._fired.get(reaction.id)
        if last is None:
            return False
        return (current_timestamp - last) < (reaction.cooldown_seconds * 1000)


# ── Topic Config ────────────────────────────────────────


@dataclass
class TopicConfig:
    """Complete configuration for a single topic.

    This object is NEVER placed in graph state. It is injected
    via closure when building the graph.
    """

    id: str
    level: int
    age_range: tuple[int, int]

    pedagogical_prompt: str
    knowledge_context: str
    chat_system_prompt: str

    suggested_questions: dict[str, list[str]]
    spotlight_id: Optional[str] = None
    spotlight_trigger: Optional[str] = None

    extra_emotions: list[str] = field(default_factory=list)
    extra_animations: list[str] = field(default_factory=list)


# ── AI Tool Factory ─────────────────────────────────────


def make_emit_reaction_tool(
    allowed_emotions: list[str],
    allowed_animations: list[str],
):
    """Creates the tool function the AI calls to emit a reaction.

    Constrained to the topic's allowed emotion/animation sets.
    """
    from langchain_core.tools import tool

    @tool
    def emit_reaction(
        message: str,
        emotion: str,
        animation: str = "none",
        type: str = "observation",
        sound: Optional[str] = None,
        suggestions: Optional[list[str]] = None,
        auto_expire_ms: int = 4000,
    ) -> dict:
        """Emit a companion reaction to the student. Use this to respond
        to what the student is doing in the simulation."""
        if emotion not in allowed_emotions:
            emotion = "idle"
        if animation not in allowed_animations:
            animation = "none"

        return ReactionPayload(
            message=message,
            emotion=emotion,
            animation=animation,
            type=type,
            sound=sound,
            suggestions=suggestions,
            auto_expire_ms=auto_expire_ms,
            source="ai",
        ).__dict__

    return emit_reaction
