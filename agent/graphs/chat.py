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

from models import TopicConfig


# ── Agent State ──────────────────────────────────────────


class ChatAgentState(CopilotKitState):
    """Chat agent state. CopilotKitState provides messages + copilotkit."""

    simulation: dict[str, Any]
    companion: dict[str, Any]


# ── Graph Builder ────────────────────────────────────────


def build_chat_graph(topic_config: TopicConfig):
    """Build the chat agent graph. TopicConfig injected via closure."""

    async def conversational_response(
        state: ChatAgentState, config: RunnableConfig
    ) -> Command:
        """Generate chat response using LLM with full simulation context."""
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import AIMessage

        try:
            # topic_config accessed via closure
            system_msg = f"""{topic_config.chat_system_prompt}

CURRENT SIMULATION STATE:
{state.get("simulation", {})}

STUDENT PROGRESS:
{state.get("companion", {}).get("progress", {})}

REACTIONS ALREADY SHOWN (don't repeat these):
{state.get("companion", {}).get("reactionHistory", [])}

TOPIC KNOWLEDGE:
{topic_config.knowledge_context}"""

            model = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.7,
            )

            response = await model.ainvoke(
                [SystemMessage(content=system_msg), *state["messages"]],
                config,
            )

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

    return graph.compile()
