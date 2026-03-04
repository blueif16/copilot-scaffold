# ═══════════════════════════════════════════════════════════
# Electric Circuits — Reaction Registry (§6.3)
# Level 2, Ages 9–10
# ═══════════════════════════════════════════════════════════

from models import EventPattern, Reaction, ReactionPayload, ReactionRegistry

electric_circuits_reactions = ReactionRegistry(
    topic_id="electric-circuits",
    reactions=[
        # ═══════════════════════════════════════════════════
        # FIRST INTERACTIONS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="welcome",
            trigger=EventPattern(event="first_interaction"),
            response=ReactionPayload(
                message="Let's build a circuit! Try dragging a wire to connect the battery to a lightbulb!",
                emotion="excited",
                animation="point",
                sound="gentle_chime",
                type="prompt",
                priority=20,
                auto_expire_ms=6000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # CIRCUIT COMPLETION
        # ═══════════════════════════════════════════════════
        Reaction(
            id="first_circuit_complete",
            trigger=EventPattern(
                event="circuit_complete",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="It's glowing! You made a complete circuit — electricity is flowing!",
                emotion="celebrating",
                animation="spark",
                sound="achievement",
                type="milestone",
                priority=20,
                auto_expire_ms=6000,
                unlock_spotlight=True,
                progress_update={
                    "first_circuit_complete": True,
                    "spotlight_available": True,
                },
                suggestions=[
                    "Why did the bulb light up?",
                    "What happens if I remove a wire?",
                ],
            ),
            one_shot=True,
        ),
        Reaction(
            id="circuit_complete_repeat",
            trigger=EventPattern(
                event="circuit_complete",
                conditions={"times_seen__gte": 2},
            ),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=3,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student has completed a circuit multiple times. They may be "
                "experimenting with different configurations or rebuilding. Consider "
                "acknowledging their exploration or staying quiet if they seem focused."
            ),
            cooldown_seconds=20,
        ),
        # ═══════════════════════════════════════════════════
        # CIRCUIT BROKEN
        # ═══════════════════════════════════════════════════
        Reaction(
            id="first_circuit_broken",
            trigger=EventPattern(
                event="circuit_broken",
                conditions={"times_seen": 1, "first_circuit_complete": True},
            ),
            response=ReactionPayload(
                message="The bulb went out! The circuit needs a complete path for electricity to flow.",
                emotion="curious",
                animation="tilt_head",
                type="observation",
                priority=12,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # COMPONENT INTERACTIONS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="switch_added",
            trigger=EventPattern(
                event="component_added",
                conditions={"component_type": "switch", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="Nice! A switch lets you control when electricity flows. Try toggling it!",
                emotion="excited",
                animation="bounce",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
                progress_update={"switch_discovered": True},
                suggestions=[
                    "How does a switch control electricity?",
                    "Can I add more bulbs?",
                ],
            ),
            one_shot=True,
        ),
        Reaction(
            id="switch_toggled_first",
            trigger=EventPattern(
                event="switch_toggled",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="See how the switch opens and closes the circuit? You're controlling the flow!",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=14,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # SECOND BULB — SOCRATIC QUESTIONING
        # ═══════════════════════════════════════════════════
        Reaction(
            id="second_bulb_added",
            trigger=EventPattern(
                event="second_bulb_added",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Ooh, two bulbs! Do you think they'll be brighter or dimmer than one bulb?",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=16,
                auto_expire_ms=7000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="second_bulb_series_complete",
            trigger=EventPattern(
                event="circuit_complete",
                conditions={"bulb_count__gte": 2, "circuit_type": "series"},
            ),
            response=ReactionPayload(
                message="They're dimmer! In a series circuit, the bulbs share the battery's energy.",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=17,
                auto_expire_ms=6000,
                suggestions=[
                    "What happens if I connect them differently?",
                    "Can I make them brighter?",
                ],
            ),
            one_shot=True,
        ),
        Reaction(
            id="parallel_circuit_built",
            trigger=EventPattern(
                event="circuit_complete",
                conditions={"bulb_count__gte": 2, "circuit_type": "parallel"},
            ),
            response=ReactionPayload(
                message="Wow! Both bulbs are bright! In a parallel circuit, each bulb gets full power!",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=18,
                auto_expire_ms=7000,
                progress_update={"parallel_circuit_built": True},
                suggestions=[
                    "Why do both bulbs stay bright?",
                    "What's different from connecting them in a line?",
                ],
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # IDLE / STUCK HINTS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="idle_no_circuit",
            trigger=EventPattern(
                event="idle_timeout",
                conditions={"seconds__gte": 30, "isComplete": False},
            ),
            response=ReactionPayload(
                message="Stuck? Try connecting the battery to a bulb with wires — make a complete loop!",
                emotion="encouraging",
                animation="point",
                type="prompt",
                priority=8,
                auto_expire_ms=7000,
            ),
            cooldown_seconds=60,
        ),
        Reaction(
            id="idle_with_circuit",
            trigger=EventPattern(
                event="idle_timeout",
                conditions={"seconds__gte": 40, "isComplete": True},
            ),
            response=ReactionPayload(
                message="Want to try something new? Add a switch or another bulb!",
                emotion="curious",
                animation="wave",
                type="suggestion",
                priority=6,
                auto_expire_ms=7000,
            ),
            cooldown_seconds=60,
        ),
        # ═══════════════════════════════════════════════════
        # SPOTLIGHT
        # ═══════════════════════════════════════════════════
        Reaction(
            id="spotlight_engaged",
            trigger=EventPattern(event="spotlight_tap"),
            response=ReactionPayload(
                message="The battery was invented in 1800! Before that, people could only make static electricity!",
                emotion="excited",
                animation="bounce",
                type="observation",
                priority=10,
                auto_expire_ms=6000,
                progress_update={"spotlight_viewed": True},
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # COMPONENT REMOVAL
        # ═══════════════════════════════════════════════════
        Reaction(
            id="component_removed_first",
            trigger=EventPattern(
                event="component_removed",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=4,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student removed a component for the first time. They may be "
                "experimenting with what happens when they break the circuit, or "
                "they may be redesigning. Consider a brief observation if appropriate."
            ),
            one_shot=True,
        ),
    ],
)
