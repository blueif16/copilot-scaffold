# ═══════════════════════════════════════════════════════════
# Genetics Basics — Reaction Registry (§6.3)
# Level 3, Ages 11–12
# ═══════════════════════════════════════════════════════════

from models import EventPattern, Reaction, ReactionPayload, ReactionRegistry

genetics_basics_reactions = ReactionRegistry(
    topic_id="genetics-basics",
    reactions=[
        # ═══════════════════════════════════════════════════
        # FIRST CROSS
        # ═══════════════════════════════════════════════════
        Reaction(
            id="first_cross_completed",
            trigger=EventPattern(
                event="first_cross",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Nice! Your first genetic cross. Check out the Punnett square — what pattern do you see?",
                emotion="excited",
                animation="nod",
                sound="gentle_chime",
                type="observation",
                priority=20,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # RECESSIVE TRAIT APPEARS — Key "aha" moment
        # ═══════════════════════════════════════════════════
        Reaction(
            id="recessive_discovered",
            trigger=EventPattern(
                event="recessive_appears",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Whoa! A recessive trait just appeared! Both parents must have been carriers. This is the key insight of genetics!",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=25,
                auto_expire_ms=8000,
                unlock_spotlight=True,
                progress_update={
                    "recessive_discovered": True,
                    "spotlight_available": True,
                },
                suggestions=[
                    "How did a blue-eyed creature appear from brown-eyed parents?",
                    "What does this tell us about the parents' genotypes?",
                ],
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # SECOND GENERATION
        # ═══════════════════════════════════════════════════
        Reaction(
            id="second_generation_started",
            trigger=EventPattern(
                event="second_generation",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="You're breeding the offspring! This is how we track traits across generations.",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # TRAIT SELECTION
        # ═══════════════════════════════════════════════════
        Reaction(
            id="trait_selected_first",
            trigger=EventPattern(
                event="trait_selected",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Good choice! Each trait follows the same inheritance rules.",
                emotion="curious",
                animation="tilt_head",
                type="observation",
                priority=10,
                auto_expire_ms=4000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # PUNNETT SQUARE COMPLETED
        # ═══════════════════════════════════════════════════
        Reaction(
            id="punnett_first",
            trigger=EventPattern(
                event="punnett_completed",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Perfect! The Punnett square shows all possible offspring. Can you predict the ratio?",
                emotion="curious",
                animation="point",
                type="prompt",
                priority=12,
                auto_expire_ms=6000,
            ),
            one_shot=True,
        ),
        Reaction(
            id="punnett_repeat",
            trigger=EventPattern(
                event="punnett_completed",
                conditions={"times_seen__gte": 3},
            ),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=3,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student has completed several Punnett squares. They may be "
                "exploring different crosses or testing predictions. Consider "
                "acknowledging their systematic approach or asking what they notice "
                "about the patterns. Keep it brief."
            ),
            cooldown_seconds=30,
        ),
        # ═══════════════════════════════════════════════════
        # OFFSPRING GENERATED
        # ═══════════════════════════════════════════════════
        Reaction(
            id="offspring_first",
            trigger=EventPattern(
                event="offspring_generated",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="There they are! Compare the offspring to your Punnett square predictions.",
                emotion="excited",
                animation="bounce",
                type="observation",
                priority=14,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # CHALLENGE COMPLETED
        # ═══════════════════════════════════════════════════
        Reaction(
            id="challenge_50_50",
            trigger=EventPattern(
                event="challenge_completed",
                conditions={"challenge_type": "fifty_fifty", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="You figured it out! Bb × bb gives exactly 50/50. That's a testcross!",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=20,
                auto_expire_ms=7000,
                progress_update={"challenge_fifty_fifty": True},
            ),
            one_shot=True,
        ),
        Reaction(
            id="challenge_3_to_1",
            trigger=EventPattern(
                event="challenge_completed",
                conditions={"challenge_type": "three_to_one", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="Perfect! Bb × Bb gives the classic 3:1 ratio. This is Mendel's famous result!",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=20,
                auto_expire_ms=7000,
                progress_update={"challenge_three_to_one": True},
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # JOURNAL ENTRIES
        # ═══════════════════════════════════════════════════
        Reaction(
            id="journal_first_entry",
            trigger=EventPattern(
                event="journal_entry",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Great! Keeping a lab journal is what real geneticists do.",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=8,
                auto_expire_ms=4000,
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # MILESTONE — Multiple crosses completed
        # ═══════════════════════════════════════════════════
        Reaction(
            id="milestone_multiple_crosses",
            trigger=EventPattern(
                event="milestone",
                conditions={"crosses_completed": True},
            ),
            response=ReactionPayload(
                message="You've completed multiple crosses! You're thinking like a geneticist now.",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=18,
                auto_expire_ms=6000,
                progress_update={"multiple_crosses": True},
                suggestions=[
                    "Can you predict the ratio before generating offspring?",
                    "What happens if you cross two heterozygous creatures?",
                ],
            ),
            one_shot=True,
        ),
        # ═══════════════════════════════════════════════════
        # SPOTLIGHT ENGAGED
        # ═══════════════════════════════════════════════════
        Reaction(
            id="spotlight_dna_sequencing",
            trigger=EventPattern(event="spotlight_tap"),
            response=ReactionPayload(
                message="DNA sequencing lets scientists read the exact genetic code — A, T, G, C base pairs!",
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
                conditions={"seconds__gte": 45},
            ),
            response=ReactionPayload(
                message="Try modifying a parent's genotype or selecting a different trait to explore!",
                emotion="encouraging",
                animation="wave",
                type="prompt",
                priority=6,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=60,
        ),
        # ═══════════════════════════════════════════════════
        # PARENT MODIFICATION
        # ═══════════════════════════════════════════════════
        Reaction(
            id="parent_modified_first",
            trigger=EventPattern(
                event="parent_modified",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Nice! Changing the genotype will change the offspring. What do you predict?",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=11,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),
    ],
)
