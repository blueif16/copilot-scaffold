"""Widget platform orchestrator graph with CopilotKit state sync."""
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

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
from .tools import backend_tools, backend_tool_names


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

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", ORCHESTRATOR_PROMPT)

llm = get_llm()


def orchestrator_node(state: OrchestratorState, config):
    """Main orchestrator node."""
    # --- Exhaustive debug dump of copilotkit state ---
    copilotkit_state = state.get("copilotkit", {})
    frontend_actions = copilotkit_state.get("actions", [])

    logger.info(f"=== COPILOTKIT STATE DEBUG ===")
    logger.info(f"copilotkit state keys: {list(copilotkit_state.keys()) if copilotkit_state else 'EMPTY'}")
    logger.info(f"copilotkit state type: {type(copilotkit_state).__name__}")
    logger.info(f"frontend actions count: {len(frontend_actions)}")
    logger.info(f"frontend actions type: {type(frontend_actions).__name__}")

    # Dump raw copilotkit state (truncated) to see what AG-UI actually sent
    try:
        raw_dump = repr(copilotkit_state)[:2000]
        logger.info(f"copilotkit raw (first 2000 chars): {raw_dump}")
    except Exception as e:
        logger.error(f"Failed to dump copilotkit state: {e}")

    for i, a in enumerate(frontend_actions):
        logger.info(f"  action[{i}]: name={getattr(a, 'name', '?')}, type={type(a).__name__}, dir={[x for x in dir(a) if not x.startswith('_')][:10]}")

    # Also check if actions are under a different key
    for key, val in copilotkit_state.items():
        logger.info(f"  copilotkit['{key}']: type={type(val).__name__}, len={len(val) if hasattr(val, '__len__') else 'N/A'}")

    logger.info(f"=== END COPILOTKIT STATE DEBUG ===")

    try:
        logger.debug(f"orchestrator_node called with {len(state.get('messages', []))} messages")
    except Exception as e:
        logger.error(f"Error logging input state: {e}")

    # Enable CopilotKit streaming + emit tool calls back to frontend
    try:
        from copilotkit.langgraph import copilotkit_customize_config
        config = copilotkit_customize_config(
            config,
            emit_tool_calls=True,
            emit_intermediate_state=[
                {"state_key": "active_widgets", "tool": "*", "tool_argument": "*"},
            ],
        )
    except ImportError:
        pass

    # Bind frontend actions + backend tools to the LLM
    all_tools = [*frontend_actions, *backend_tools]
    logger.info(f"Binding {len(all_tools)} tools to LLM ({len(frontend_actions)} frontend + {len(backend_tools)} backend)")
    llm_with_tools = llm.bind_tools(all_tools)

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]

    try:
        response = llm_with_tools.invoke(messages, config=config)
    except Exception as e:
        logger.error(f"LLM invoke error: {e}", exc_info=True)
        raise

    logger.info(f">>> LLM RESPONSE: content={repr(response.content)[:200] if response.content else 'EMPTY'}, tool_calls={bool(getattr(response, 'tool_calls', None))}")
    if getattr(response, 'tool_calls', None):
        for tc in response.tool_calls:
            is_backend = tc.get('name', '') in backend_tool_names
            logger.info(f"    tool_call: {tc.get('name')} → {'ToolNode' if is_backend else 'AG-UI (frontend)'}")

    if hasattr(response, "additional_kwargs"):
        response.additional_kwargs.pop("reasoning_content", None)

    return {"messages": [response]}


def should_continue(state: OrchestratorState):
    """Route after orchestrator responds."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        has_backend_call = any(
            tc.get("name") in backend_tool_names
            for tc in last.tool_calls
        )
        if has_backend_call:
            return "tools"
        logger.info("All tool calls are frontend → routing to END for AG-UI")
        return END
    return END


def create_graph():
    workflow = StateGraph(OrchestratorState)
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("tools", ToolNode(backend_tools))
    workflow.add_edge(START, "orchestrator")
    workflow.add_conditional_edges("orchestrator", should_continue)
    workflow.add_edge("tools", "orchestrator")
    return workflow.compile(
        checkpointer=MemorySaver(),
    ).with_config({"recursion_limit": 25})


graph = create_graph()
