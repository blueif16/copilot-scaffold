# ═══════════════════════════════════════════════════════════
# Changing States — Reaction Registry (§6.3)
# Level 1, Ages 6–8
# ═══════════════════════════════════════════════════════════

from models import EventPattern, Reaction, ReactionPayload, ReactionRegistry

changing_states_reactions = ReactionRegistry(
    topic_id="changing-states",
    reactions=[
        # ═══════════════════════════════════════════════════
        # FIRST INTERACTIONS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="welcome",
            trigger=EventPattern(event="first_interaction"),
            response=ReactionPayload(
                message="Ooh, try sliding it! See what happens to the tiny particles!",
                emotion="excited",
                animation="point",
                sound="gentle_chime",
                type="prompt",
                priority=20,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # PHASE TRANSITIONS — First time each
        # ═══════════════════════════════════════════════════
        Reaction(
            id="first_solid_to_liquid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "solid", "to": "liquid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="Whoa! You melted it! See how the particles started moving apart?",
                emotion="excited",
                animation="bounce",
                sound="discovery_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="first_liquid_to_gas",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "liquid", "to": "gas", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="It's boiling! The particles are zooming everywhere!",
                emotion="excited",
                animation="bounce",
                sound="discovery_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="first_liquid_to_solid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "liquid", "to": "solid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="You froze it back! The particles snapped right back together!",
                emotion="impressed",
                animation="nod",
                sound="gentle_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="first_gas_to_liquid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "gas", "to": "liquid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message=(
                    "You caught the steam! It turned back into a liquid "
                    "\u2014 that's called condensation!"
                ),
                emotion="impressed",
                animation="nod",
                sound="gentle_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # PHASE TRANSITIONS — Repeated (escalate to AI)
        # ═══════════════════════════════════════════════════
        Reaction(
            id="repeat_transition_escalate",
            trigger=EventPattern(
                event="phase_change",
                conditions={"times_seen__gte": 4},
            ),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=3,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student has triggered several phase transitions now. "
                "They seem to be experimenting freely. Consider acknowledging "
                "their exploration pattern, asking what they notice, or staying "
                "quiet if they seem focused. Keep it to one short sentence max."
            ),
            cooldown_seconds=20,
        ),
        # ═══════════════════════════════════════════════════
        # DWELL TIMEOUTS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="dwell_solid",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "solid", "seconds__gte": 8},
            ),
            response=ReactionPayload(
                message="What do you think happens if you warm it up? Slide to the right!",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=5,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=30,
        ),
        Reaction(
            id="dwell_liquid",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "liquid", "seconds__gte": 10},
            ),
            response=ReactionPayload(
                suggestions=[
                    "Can you find the exact spot where it melts?",
                    "What happens if you keep heating it?",
                ],
                emotion="curious",
                animation="tilt_head",
                type="suggestion",
                priority=4,
                auto_expire_ms=10000,
            ),
            cooldown_seconds=30,
        ),
        Reaction(
            id="dwell_gas",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "gas", "seconds__gte": 8},
            ),
            response=ReactionPayload(
                message="What do you think happens if you cool it back down? Try it!",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=5,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=30,
        ),
        # ═══════════════════════════════════════════════════
        # INTERACTION PATTERNS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="reversal_first",
            trigger=EventPattern(
                event="reversal",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Oh, you went backwards! It changes both ways \u2014 cool, right?",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=8,
                auto_expire_ms=4000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="rapid_cycling",
            trigger=EventPattern(event="rapid_cycling"),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=2,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student is rapidly cycling the slider back and forth through "
                "multiple transitions. They might be playing, testing, or exploring "
                "the transition boundaries. This is good experimental behavior. "
                "Consider a brief, encouraging comment. Max one sentence."
            ),
            cooldown_seconds=30,
        ),
        # ═══════════════════════════════════════════════════
        # MILESTONES
        # ═══════════════════════════════════════════════════
        Reaction(
            id="all_phases_discovered",
            trigger=EventPattern(
                event="milestone",
                conditions={"all_phases_visited": True},
            ),
            response=ReactionPayload(
                message=(
                    "You discovered all three states of matter! "
                    "Solid, liquid, and gas \u2014 you're a real scientist!"
                ),
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=20,
                auto_expire_ms=8000,
                unlock_spotlight=True,
                progress_update={
                    "all_phases_discovered": True,
                    "spotlight_available": True,
                },
                suggestions=[
                    "What was the coolest change?",
                    "Where does the steam go?",
                ],
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # SPOTLIGHT
        # ═══════════════════════════════════════════════════
        Reaction(
            id="spotlight_engaged",
            trigger=EventPattern(event="spotlight_tap"),
            response=ReactionPayload(
                message=(
                    "Pressure cookers are so cool \u2014 they trap the steam "
                    "to cook food faster!"
                ),
                emotion="excited",
                animation="bounce",
                type="observation",
                priority=10,
                auto_expire_ms=5000,
                progress_update={"spotlight_viewed": True},
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # IDLE / INACTIVITY
        # ═══════════════════════════════════════════════════
        Reaction(
            id="idle_nudge",
            trigger=EventPattern(
                event="idle_timeout",
                conditions={"seconds__gte": 30},
            ),
            response=ReactionPayload(
                message="Hey! Try moving the slider \u2014 I wonder what will happen!",
                emotion="encouraging",
                animation="wave",
                type="prompt",
                priority=6,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=60,
        ),
    ],
)
