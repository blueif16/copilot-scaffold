"""Widget platform orchestrator graph with CopilotKit state sync."""
import os
from dotenv import load_dotenv

load_dotenv()

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage

from .state import OrchestratorState
from .tools import all_tools


def get_llm():
    """Get the LLM instance based on environment configuration."""
    provider = os.getenv("LLM_PROVIDER", "google")
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            temperature=0.7,
        )
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GOOGLE_MODEL", "gemini-3.1-flash-lite-preview"),
            temperature=0.7,
            thinking_budget=0,
        )


ORCHESTRATOR_PROMPT = """You are the platform orchestrator. You decide which widgets to show based on the user's requests.

RULES:
- When the user asks to see something, call the matching tool
- You may call multiple tools in sequence (e.g. show_user_card then show_topic_progress)
- When the user asks to see their profile, stats, or progress, call BOTH show_user_card AND show_topic_progress
- Keep your responses brief. Let the widgets do the talking.
- Be helpful and friendly.
"""

# Allow overriding the prompt via env var
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", ORCHESTRATOR_PROMPT)

llm = get_llm()
llm_with_tools = llm.bind_tools(all_tools)


def orchestrator_node(state: OrchestratorState, config):
    """Main orchestrator node with CopilotKit state sync support."""
    # Enable intermediate state streaming for CopilotKit
    try:
        from copilotkit.langchain import copilotkit_customize_config
        config = copilotkit_customize_config(
            config,
            emit_intermediate_state=[
                {"state_key": "active_widgets", "tool": "*", "tool_argument": "*"},
            ],
        )
    except ImportError:
        pass  # CopilotKit not installed — still works standalone

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm_with_tools.invoke(messages, config=config)

    # Strip reasoning content to prevent REASONING event stalls
    if hasattr(response, "additional_kwargs"):
        response.additional_kwargs.pop("reasoning_content", None)

    return {"messages": [response]}


def should_continue(state: OrchestratorState):
    """Route: if last message has tool calls, go to tools node."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


def create_graph():
    """Create and compile the orchestrator graph."""
    workflow = StateGraph(OrchestratorState)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("tools", ToolNode(all_tools))
    workflow.add_edge(START, "orchestrator")
    workflow.add_conditional_edges("orchestrator", should_continue)
    workflow.add_edge("tools", "orchestrator")
    return workflow.compile(
        checkpointer=MemorySaver(),
    ).with_config({"recursion_limit": 25})


graph = create_graph()
