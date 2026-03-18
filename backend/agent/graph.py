"""Generic LangGraph agent with CopilotKit state sync."""
import os
from dotenv import load_dotenv

load_dotenv()

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage

from .state import AgentState
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


SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful assistant. Use your available tools when appropriate.",
)

llm = get_llm()
llm_with_tools = llm.bind_tools(all_tools)


def agent_node(state: AgentState, config):
    """Main agent node with CopilotKit state sync support."""
    # Enable intermediate state streaming for CopilotKit
    try:
        from copilotkit.langchain import copilotkit_customize_config
        config = copilotkit_customize_config(
            config,
            emit_intermediate_state=[
                {"state_key": "metadata", "tool": "*", "tool_argument": "*"},
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


def should_continue(state: AgentState):
    """Route: if last message has tool calls, go to tools node."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


def create_graph():
    """Create and compile the agent graph."""
    workflow = StateGraph(AgentState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(all_tools))
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")
    return workflow.compile(
        checkpointer=MemorySaver(),
    ).with_config({"recursion_limit": 25})


graph = create_graph()
