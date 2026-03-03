# ═══════════════════════════════════════════════════════════
# AI Reaction Emission Tool
#
# Creates a constrained LangChain tool that the LLM calls to
# emit a companion reaction. Emotion and animation values are
# validated against the topic's allowed sets.
#
# Gemini supports tool calling natively via bind_tools().
# ═══════════════════════════════════════════════════════════

from models import make_emit_reaction_tool

__all__ = ["make_emit_reaction_tool"]
