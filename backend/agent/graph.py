"""Widget platform orchestrator graph with CopilotKit state sync."""
import os
import json
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage, ToolMessage

from .state import OrchestratorState
from .tools import (
    orchestrator_tools, orchestrator_tool_names,
    particle_sim_tools, particle_sim_tool_names,
    backend_tool_names,
)


def get_llm():
    provider = os.getenv("LLM_PROVIDER", "google")
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o"), temperature=0.7)
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
asked for something that needs more than one widget.

RULES:
- Every piece of UI must come from a tool call
- Call multiple tools in one turn when showing a composite view
- Keep text responses brief — the widgets ARE the response
- Be helpful and friendly
- clear_canvas(widget_ids?) removes widgets from the canvas (backend tool — updates state immediately).
  - Omit widget_ids to clear ALL widgets.
  - Pass specific IDs like ["user_card"] or ["topic_progress", "particle_sim"] to remove only those.
- When switching to a DIFFERENT view, call clear_canvas() FIRST (same response), then call the new widget tools.
- When replacing just one widget while keeping others, call clear_canvas(widget_ids=["<id>"]) then spawn the replacement.
- show_particle_sim launches an interactive simulation — after spawning it, the particle simulation
  assistant takes over the conversation to guide the user through phase transitions.
"""

_PARTICLE_SIM_PROMPT_FILE = (
    Path(__file__).parent.parent.parent
    / "examples" / "science_lab" / "widgets" / "particle-sim" / "agent" / "prompt.md"
)
PARTICLE_SIM_PROMPT = (
    _PARTICLE_SIM_PROMPT_FILE.read_text()
    if _PARTICLE_SIM_PROMPT_FILE.exists()
    else "You are the Particle Simulation assistant. Help the user explore solid, liquid, and gas states."
)

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", ORCHESTRATOR_PROMPT)

llm = get_llm()


# ---------------------------------------------------------------------------
# Orchestrator node
# ---------------------------------------------------------------------------

def orchestrator_node(state: OrchestratorState, config):
    """Main orchestrator node."""
    copilotkit_state = state.get("copilotkit", {})
    frontend_actions = copilotkit_state.get("actions", [])

    logger.info(f"[ORCHESTRATOR] messages={len(state.get('messages', []))} frontend_actions={len(frontend_actions)} focused_agent={state.get('focused_agent')}")

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

    all_tools = [*frontend_actions, *orchestrator_tools]
    logger.info(f"[ORCHESTRATOR] binding {len(all_tools)} tools ({len(frontend_actions)} frontend + {len(orchestrator_tools)} backend)")
    llm_with_tools = llm.bind_tools(all_tools)

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm_with_tools.invoke(messages, config=config)

    if hasattr(response, "additional_kwargs"):
        response.additional_kwargs.pop("reasoning_content", None)

    if getattr(response, "tool_calls", None):
        for tc in response.tool_calls:
            is_backend = tc.get("name", "") in orchestrator_tool_names
            logger.info(f"  tool_call: {tc.get('name')} → {'backend' if is_backend else 'AG-UI (frontend)'}")

    return {"messages": [response]}


def route_orchestrator(state: OrchestratorState):
    """Route after orchestrator: backend tool call → tools_node, else → END."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        has_backend = any(tc.get("name") in orchestrator_tool_names for tc in last.tool_calls)
        if has_backend:
            return "tools"
        logger.info("[ORCHESTRATOR] all tool calls are frontend → END for AG-UI")
    return END


# ---------------------------------------------------------------------------
# Particle-sim subagent node
# ---------------------------------------------------------------------------

def particle_sim_node(state: OrchestratorState, config):
    """Particle simulation subagent — has domain-specific tools only."""
    logger.info(f"[PARTICLE_SIM] messages={len(state.get('messages', []))} widget_state={state.get('widget_state')}")

    try:
        from copilotkit.langgraph import copilotkit_customize_config
        config = copilotkit_customize_config(
            config,
            emit_tool_calls=True,
            emit_intermediate_state=[
                {"state_key": "widget_state", "tool": "set_particle_state", "tool_argument": "new_state"},
            ],
        )
    except ImportError:
        pass

    llm_with_tools = llm.bind_tools(particle_sim_tools)
    messages = [SystemMessage(content=PARTICLE_SIM_PROMPT)] + state["messages"]
    response = llm_with_tools.invoke(messages, config=config)

    if hasattr(response, "additional_kwargs"):
        response.additional_kwargs.pop("reasoning_content", None)

    if getattr(response, "tool_calls", None):
        for tc in response.tool_calls:
            logger.info(f"  [PARTICLE_SIM] tool_call: {tc.get('name')}")

    return {"messages": [response]}


def route_particle_sim(state: OrchestratorState):
    """Route after particle_sim node: any tool call → tools_node, else → END."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


# ---------------------------------------------------------------------------
# Shared tools node
# ---------------------------------------------------------------------------

# Non-state-mutating backend tools (callable directly)
_callable_tool_map = {
    t.name: t for t in orchestrator_tools + particle_sim_tools
    if t.name not in {"clear_canvas", "show_particle_sim", "set_particle_state", "handoff_to_orchestrator"}
}


def tools_node(state: OrchestratorState) -> dict:
    """Unified tool executor for both orchestrator and particle_sim tool calls.

    State-mutating tools (clear_canvas, show_particle_sim, set_particle_state,
    handoff_to_orchestrator) are handled inline. All others are delegated.
    """
    last = state["messages"][-1]
    messages = []
    state_updates: dict = {}

    for tc in last.tool_calls:
        name = tc["name"]

        if name == "clear_canvas":
            ids = tc["args"].get("widget_ids") or None
            if ids is not None and len(ids) == 0:
                ids = None
            state_updates["canvas_clear"] = {"ids": ids, "seq": int(time.time() * 1000)}
            # Also remove from active_widgets
            current_active = list(state.get("active_widgets") or [])
            if ids is None:
                state_updates["active_widgets"] = []
            else:
                state_updates["active_widgets"] = [w for w in current_active if w not in ids]
            logger.info(f"[TOOLS] clear_canvas: ids={ids}")
            messages.append(ToolMessage(
                content=json.dumps({"cleared": ids if ids else "all"}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name == "show_particle_sim":
            initial_state = tc["args"].get("initial_state", "gas")
            state_updates["focused_agent"] = "particle_sim"
            state_updates["widget_state"] = {"current_state": initial_state}
            current_active = list(state.get("active_widgets") or [])
            if "particle_sim" not in current_active:
                current_active.append("particle_sim")
            state_updates["active_widgets"] = current_active
            logger.info(f"[TOOLS] show_particle_sim: initial_state={initial_state} → focused_agent=particle_sim")
            messages.append(ToolMessage(
                content=json.dumps({"spawned": "particle_sim", "initial_state": initial_state}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name == "set_particle_state":
            new_state = tc["args"].get("new_state", "gas")
            current_ws = dict(state.get("widget_state") or {})
            current_ws["current_state"] = new_state
            state_updates["widget_state"] = current_ws
            logger.info(f"[TOOLS] set_particle_state: new_state={new_state}")
            messages.append(ToolMessage(
                content=json.dumps({"new_state": new_state, "status": "ok"}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name == "handoff_to_orchestrator":
            state_updates["focused_agent"] = None
            logger.info("[TOOLS] handoff_to_orchestrator: clearing focused_agent")
            messages.append(ToolMessage(
                content=json.dumps({"status": "handing_off"}),
                tool_call_id=tc["id"], name=name,
            ))

        else:
            fn = _callable_tool_map.get(name)
            result = fn.invoke(tc["args"]) if fn else f"Unknown tool: {name}"
            messages.append(ToolMessage(
                content=str(result),
                tool_call_id=tc["id"], name=name,
            ))

    return {**state_updates, "messages": messages}


def route_after_tools(state: OrchestratorState):
    """After tools_node: route to active subagent or back to orchestrator."""
    focused = state.get("focused_agent")
    if focused == "particle_sim":
        logger.info("[TOOLS] → particle_sim_node")
        return "particle_sim"
    logger.info("[TOOLS] → orchestrator")
    return "orchestrator"


# ---------------------------------------------------------------------------
# Entry router
# ---------------------------------------------------------------------------

def route_entry(state: OrchestratorState):
    """Route at graph entry: resume active subagent or go to orchestrator."""
    focused = state.get("focused_agent")
    if focused == "particle_sim":
        logger.info("[ENTRY] resuming particle_sim subagent")
        return "particle_sim"
    return "orchestrator"


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def create_graph():
    workflow = StateGraph(OrchestratorState)

    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("particle_sim", particle_sim_node)
    workflow.add_node("tools", tools_node)

    # Entry: resume subagent if one is focused, else go to orchestrator
    workflow.add_conditional_edges(START, route_entry, {
        "orchestrator": "orchestrator",
        "particle_sim": "particle_sim",
    })

    # Orchestrator: backend tool call → tools, else → END
    workflow.add_conditional_edges("orchestrator", route_orchestrator, {
        "tools": "tools",
        END: END,
    })

    # Particle_sim: any tool call → tools, else → END
    workflow.add_conditional_edges("particle_sim", route_particle_sim, {
        "tools": "tools",
        END: END,
    })

    # After tools: route back to active subagent or orchestrator
    workflow.add_conditional_edges("tools", route_after_tools, {
        "particle_sim": "particle_sim",
        "orchestrator": "orchestrator",
    })

    return workflow.compile(
        checkpointer=MemorySaver(),
    ).with_config({"recursion_limit": 25})


graph = create_graph()
