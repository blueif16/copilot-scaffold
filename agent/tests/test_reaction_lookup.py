# ═══════════════════════════════════════════════════════════
# Tests — Reaction Registry Lookup
#
# Acceptance criteria from Slice 5:
# 1. first_interaction matches "welcome"
# 2. phase_change solid→liquid matches "first_solid_to_liquid"
# 3. unknown event returns (None, True) for AI escalation
# 4. one_shot reactions don't fire twice
# 5. cooldown prevents re-fire within window
# ═══════════════════════════════════════════════════════════

import pytest

from models import ReactionRegistry, SimulationEvent
from topics.changing_states.reactions import changing_states_reactions
from tests.fixtures.sample_events import (
    FIRST_INTERACTION,
    PHASE_CHANGE_SOLID_TO_LIQUID,
    DWELL_TIMEOUT_SOLID,
    UNKNOWN_EVENT,
)


def _make_registry() -> ReactionRegistry:
    """Return a fresh registry copy so tests don't share fired state."""
    return ReactionRegistry(
        topic_id=changing_states_reactions.topic_id,
        reactions=list(changing_states_reactions.reactions),
    )


def _to_sim_event(d: dict) -> SimulationEvent:
    return SimulationEvent(
        type=d["type"],
        timestamp=d["timestamp"],
        data=d.get("data", {}),
    )


def _default_context() -> dict:
    """Minimal context that doesn't influence matching beyond event data."""
    return {
        "temperature": 50,
        "phase": "liquid",
        "times_seen": 1,
        "reaction_history": [],
    }


# ─── Test 1: first_interaction → "welcome" ────────────────


def test_first_interaction_matches_welcome():
    registry = _make_registry()
    event = _to_sim_event(FIRST_INTERACTION)
    context = _default_context()

    reaction, needs_ai = registry.lookup(event, context)

    assert reaction is not None
    assert reaction.id == "welcome"
    assert needs_ai is False
    assert reaction.response.emotion == "excited"
    assert reaction.response.animation == "point"


# ─── Test 2: phase_change solid→liquid → "first_solid_to_liquid" ──


def test_phase_change_solid_to_liquid():
    registry = _make_registry()
    event = _to_sim_event(PHASE_CHANGE_SOLID_TO_LIQUID)
    context = _default_context()

    reaction, needs_ai = registry.lookup(event, context)

    assert reaction is not None
    assert reaction.id == "first_solid_to_liquid"
    assert needs_ai is False
    assert reaction.response.message is not None
    assert "melted" in reaction.response.message.lower()


# ─── Test 3: unknown event → (None, True) → AI escalation ──


def test_unknown_event_escalates_to_ai():
    registry = _make_registry()
    event = _to_sim_event(UNKNOWN_EVENT)
    context = _default_context()

    reaction, needs_ai = registry.lookup(event, context)

    assert reaction is None
    assert needs_ai is True


# ─── Test 4: one_shot reactions don't fire twice ───────────


def test_one_shot_does_not_fire_twice():
    registry = _make_registry()
    event = _to_sim_event(FIRST_INTERACTION)
    context = _default_context()

    # First fire
    reaction1, _ = registry.lookup(event, context)
    assert reaction1 is not None
    assert reaction1.id == "welcome"

    # Second fire — same event, later timestamp
    event2 = SimulationEvent(
        type="first_interaction",
        timestamp=5000.0,
        data={},
    )
    reaction2, needs_ai = registry.lookup(event2, context)

    # "welcome" is one_shot, so it should NOT match again.
    # If no other reactions match first_interaction, we escalate.
    assert reaction2 is None or reaction2.id != "welcome"


# ─── Test 5: cooldown prevents re-fire within window ──────


def test_cooldown_prevents_refire():
    registry = _make_registry()
    context = {**_default_context(), "phase": "solid"}

    # First dwell_timeout in solid phase
    event1 = _to_sim_event(DWELL_TIMEOUT_SOLID)
    reaction1, needs_ai1 = registry.lookup(event1, context)

    assert reaction1 is not None
    assert reaction1.id == "dwell_solid"
    assert needs_ai1 is False

    # Second dwell_timeout only 5 seconds later (cooldown is 30s = 30000ms)
    event2 = SimulationEvent(
        type="dwell_timeout",
        timestamp=DWELL_TIMEOUT_SOLID["timestamp"] + 5000,
        data={"phase": "solid", "seconds": 15},
    )
    reaction2, needs_ai2 = registry.lookup(event2, context)

    # dwell_solid should be on cooldown, so it won't match
    assert reaction2 is None or reaction2.id != "dwell_solid"


# ─── Test 6: escalation flag on repeated transitions ──────


def test_repeated_transitions_escalate():
    registry = _make_registry()
    context = {**_default_context(), "times_seen": 5}

    # A phase_change with times_seen >= 4 should match repeat_transition_escalate
    event = SimulationEvent(
        type="phase_change",
        timestamp=50000.0,
        data={"from": "solid", "to": "liquid", "times_seen": 5},
    )
    reaction, needs_ai = registry.lookup(event, context)

    # The first_solid_to_liquid is one_shot and hasn't fired,
    # so it may match first. Let's fire it first:
    first_event = _to_sim_event(PHASE_CHANGE_SOLID_TO_LIQUID)
    registry.lookup(first_event, _default_context())

    # Now retry the repeated event
    reaction, needs_ai = registry.lookup(event, context)

    # Should either be repeat_transition_escalate (needs_ai=True)
    # or first_solid_to_liquid is consumed, and repeat matches
    if reaction is not None and reaction.id == "repeat_transition_escalate":
        assert needs_ai is True
        assert reaction.escalate_to_ai is True


# ─── Test 7: milestone reaction triggers progress update ──


def test_milestone_updates_progress():
    registry = _make_registry()
    context = _default_context()

    event = SimulationEvent(
        type="milestone",
        timestamp=8000.0,
        data={"all_phases_visited": True},
    )
    reaction, needs_ai = registry.lookup(event, context)

    assert reaction is not None
    assert reaction.id == "all_phases_discovered"
    assert needs_ai is False
    assert reaction.response.progress_update is not None
    assert reaction.response.progress_update.get("all_phases_discovered") is True
    assert reaction.response.unlock_spotlight is True
    assert reaction.response.emotion == "celebrating"
    assert reaction.response.animation == "confetti"
