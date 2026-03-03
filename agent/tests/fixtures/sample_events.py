# ═══════════════════════════════════════════════════════════
# Sample Simulation Events — Test Fixtures
#
# One sample dict per event type from §3.2.
# Timestamps are sequential starting at 1000.0 ms.
# ═══════════════════════════════════════════════════════════

FIRST_INTERACTION = {
    "type": "first_interaction",
    "timestamp": 1000.0,
    "data": {},
}

PHASE_CHANGE_SOLID_TO_LIQUID = {
    "type": "phase_change",
    "timestamp": 2000.0,
    "data": {"from": "solid", "to": "liquid", "times_seen": 1},
}

PHASE_CHANGE_LIQUID_TO_GAS = {
    "type": "phase_change",
    "timestamp": 3000.0,
    "data": {"from": "liquid", "to": "gas", "times_seen": 1},
}

PHASE_CHANGE_LIQUID_TO_SOLID = {
    "type": "phase_change",
    "timestamp": 4000.0,
    "data": {"from": "liquid", "to": "solid", "times_seen": 1},
}

PHASE_CHANGE_GAS_TO_LIQUID = {
    "type": "phase_change",
    "timestamp": 5000.0,
    "data": {"from": "gas", "to": "liquid", "times_seen": 1},
}

PHASE_CHANGE_REPEATED = {
    "type": "phase_change",
    "timestamp": 50000.0,
    "data": {"from": "solid", "to": "liquid", "times_seen": 5},
}

DWELL_TIMEOUT_SOLID = {
    "type": "dwell_timeout",
    "timestamp": 10000.0,
    "data": {"phase": "solid", "seconds": 10},
}

DWELL_TIMEOUT_LIQUID = {
    "type": "dwell_timeout",
    "timestamp": 11000.0,
    "data": {"phase": "liquid", "seconds": 12},
}

DWELL_TIMEOUT_GAS = {
    "type": "dwell_timeout",
    "timestamp": 12000.0,
    "data": {"phase": "gas", "seconds": 9},
}

REVERSAL = {
    "type": "reversal",
    "timestamp": 6000.0,
    "data": {"previousDirection": "heating", "times_seen": 1},
}

RAPID_CYCLING = {
    "type": "rapid_cycling",
    "timestamp": 7000.0,
    "data": {"transitionsInWindow": 4},
}

MILESTONE_ALL_PHASES = {
    "type": "milestone",
    "timestamp": 8000.0,
    "data": {"all_phases_visited": True},
}

SPOTLIGHT_TAP = {
    "type": "spotlight_tap",
    "timestamp": 9000.0,
    "data": {},
}

IDLE_TIMEOUT = {
    "type": "idle_timeout",
    "timestamp": 40000.0,
    "data": {"seconds": 35},
}

# An event type with no matching reaction — should escalate to AI
UNKNOWN_EVENT = {
    "type": "particle_collision",
    "timestamp": 15000.0,
    "data": {"count": 42},
}
