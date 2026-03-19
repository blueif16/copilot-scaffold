"""Widget platform orchestrator graph with CopilotKit state sync."""
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Data-first logging: log message flow at key points
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

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
        )


ORCHESTRATOR_PROMPT = """You are the platform orchestrator. You spawn UI widgets by calling tools. \
Every widget on screen was created by a tool call — there is no other way to show UI.

Each tool's description includes a [Layout] hint showing the widget's size.
Use this to compose sensible layouts:
- Two "half width, compact" widgets fit side-by-side nicely
- A "full width, fill height" widget is a big interactive experience — show it alone

IMPORTANT: You can (and should) call MULTIPLE tools in a SINGLE response when the user \
asks for something that needs more than one widget. Both tool calls go in the same message. \
Do NOT wait for one tool result before calling the next — commit to all calls at once.

Example: user says "show me my profile" → you respond with text AND two tool calls:
  text: "Here's your dashboard!"
  tool_call: show_user_card(...)
  tool_call: show_topic_progress(...)

RULES:
- Every piece of UI must come from a tool call
- Call multiple tools in one turn when showing a composite view
- Keep text responses brief — the widgets ARE the response
- Be helpful and friendly
"""

# Allow overriding the prompt via env var
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", ORCHESTRATOR_PROMPT)

llm = get_llm()
llm_with_tools = llm.bind_tools(all_tools)


def orchestrator_node(state: OrchestratorState, config):
    """Main orchestrator node with CopilotKit state sync support."""
    try:
        logger.debug(f"orchestrator_node called with {len(state.get('messages', []))} messages")
        if state.get('messages'):
            last_msg = state['messages'][-1]
            logger.debug(f"Last message type: {type(last_msg).__name__}, content: {getattr(last_msg, 'content', None)[:100] if last_msg.content else None}")
    except Exception as e:
        logger.error(f"Error logging input state: {e}")
    # Enable intermediate state streaming for CopilotKit
    try:
        from copilotkit.langgraph import copilotkit_customize_config
        config = copilotkit_customize_config(
            config,
            emit_intermediate_state=[
                {"state_key": "active_widgets", "tool": "*", "tool_argument": "*"},
            ],
        )
    except ImportError:
        pass  # CopilotKit not installed — still works standalone

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    logger.debug(f"Invoking LLM with {len(messages)} messages (incl system)")
    try:
        response = llm_with_tools.invoke(messages, config=config)
    except Exception as e:
        logger.error(f"LLM invoke error: {e}", exc_info=True)
        raise

    logger.info(f">>> LLM RESPONSE: type={type(response).__name__}, content={repr(response.content)[:300] if response.content else 'EMPTY'}, tool_calls={bool(getattr(response, 'tool_calls', None))}")
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
