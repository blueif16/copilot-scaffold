"""Widget platform orchestrator graph — skeleton only.

No example names, no widget names, no domain-specific logic.
All content is injected at startup via the subagent registry.
"""
import os
import json
import logging
import time
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
from .tools import skeleton_tools, clear_canvas, handoff_to_orchestrator
from .subagents import load_subagent_registry

# ---------------------------------------------------------------------------
# Load registry at startup — all content comes from examples
# ---------------------------------------------------------------------------

_registry = load_subagent_registry()

# spawn tool name → SubagentConfig
_spawn_tool_map = {cfg.spawn_tool.name: cfg for cfg in _registry.values()}

# domain tool name → (tool callable, SubagentConfig)
_domain_tool_map = {
    t.name: t
    for cfg in _registry.values()
    for t in cfg.domain_tools
}

# All tool names that go to tools_node instead of AG-UI
_backend_tool_names = (
    {t.name for t in skeleton_tools}
    | set(_spawn_tool_map.keys())
    | set(_domain_tool_map.keys())
    | {handoff_to_orchestrator.name}
)

# Spawn tools to bind on orchestrator LLM (from registry)
_spawn_tools = [cfg.spawn_tool for cfg in _registry.values()]


# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

def get_llm():
    provider = os.getenv("LLM_PROVIDER", "nebius")
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o"), temperature=0.7)
    elif provider == "nebius":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("NEBIUS_MODEL", "Qwen/Qwen3-32B-fast"),
            base_url="https://api.tokenfactory.nebius.com/v1/",
            api_key=os.getenv("NEBIUS_API_KEY"),
            temperature=0.7,
        )
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GOOGLE_MODEL", "gemini-3.1-flash-lite-preview"),
            temperature=0.7,
        )


llm = get_llm()


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

ORCHESTRATOR_PROMPT = """You are the platform orchestrator. You spawn UI widgets by calling tools.
Every widget on screen was created by a tool call — there is no other way to show UI.

Each tool description may include a [Layout] hint. Use it to compose sensible layouts:
- Two "half width" widgets fit side-by-side
- A "full width, fill height" widget is a big interactive experience — show it alone

RULES:
- Every piece of UI must come from a tool call
- Call multiple tools in one turn when showing a composite view
- Keep text responses brief — the widgets ARE the response
- clear_canvas(widget_ids?) removes widgets. Omit to clear ALL. Pass ids to remove specific ones.
- When switching views: call clear_canvas() FIRST, then call the new widget tool(s).
- When a spawn tool description says it launches an interactive experience, after calling it
  a specialist assistant takes over the conversation for that widget.
"""

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", ORCHESTRATOR_PROMPT)


# ---------------------------------------------------------------------------
# Orchestrator node
# ---------------------------------------------------------------------------

async def orchestrator_node(state: OrchestratorState, config):
    copilotkit_state = state.get("copilotkit", {})
    frontend_actions = copilotkit_state.get("actions", [])

    logger.info(
        f"[ORCHESTRATOR] messages={len(state.get('messages', []))} "
        f"frontend={len(frontend_actions)} spawn_tools={len(_spawn_tools)} "
        f"focused={state.get('focused_agent')}"
    )

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

    # Bind: frontend dumb-widget tools + skeleton tools + spawn tools from registry
    all_tools = [*frontend_actions, *skeleton_tools, *_spawn_tools]
    llm_with_tools = llm.bind_tools(all_tools)
    pending = state.get("pending_agent_message")
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    if pending:
        from langchain_core.messages import HumanMessage
        messages = messages + [HumanMessage(content=pending)]
        logger.info(f"[ORCHESTRATOR] injecting pending message: {pending[:60]}")
    response = await llm_with_tools.ainvoke(messages, config=config)

    if hasattr(response, "additional_kwargs"):
        response.additional_kwargs.pop("reasoning_content", None)

    if getattr(response, "tool_calls", None):
        for tc in response.tool_calls:
            is_backend = tc.get("name", "") in _backend_tool_names
            logger.info(f"  tool_call: {tc.get('name')} → {'backend' if is_backend else 'AG-UI'}")

    return {"pending_agent_message": None, "messages": [response]}


def route_orchestrator(state: OrchestratorState):
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        if any(tc.get("name") in _backend_tool_names for tc in last.tool_calls):
            return "tools"
        logger.info("[ORCHESTRATOR] all frontend → END for AG-UI")
    return END


# ---------------------------------------------------------------------------
# Subagent node factory — generic, works for any SubagentConfig
# ---------------------------------------------------------------------------

def make_subagent_node(cfg):
    """Return a node function for the given subagent config."""
    # Inject handoff_to_orchestrator so examples don't have to define it
    subagent_tools = cfg.domain_tools + [handoff_to_orchestrator]
    llm_with_tools = llm.bind_tools(subagent_tools)

    async def subagent_node(state: OrchestratorState, config):
        logger.info(
            f"[SUBAGENT:{cfg.id}] messages={len(state.get('messages', []))} "
            f"widget_state={state.get('widget_state')}"
        )
        try:
            from copilotkit.langgraph import copilotkit_customize_config
            _config = copilotkit_customize_config(
                config,
                emit_tool_calls=True,
                emit_intermediate_state=[
                    {"state_key": "widget_state", "tool": "*", "tool_argument": "*"},
                ],
            )
        except ImportError:
            _config = config

        pending = state.get("pending_agent_message")
        base_messages = [SystemMessage(content=cfg.prompt)] + state["messages"]
        if pending:
            from langchain_core.messages import HumanMessage
            base_messages = base_messages + [HumanMessage(content=pending)]
            logger.info(f"  [SUBAGENT:{cfg.id}] injecting pending message: {pending[:60]}")
        response = await llm_with_tools.ainvoke(base_messages, config=_config)

        if hasattr(response, "additional_kwargs"):
            response.additional_kwargs.pop("reasoning_content", None)

        if getattr(response, "tool_calls", None):
            for tc in response.tool_calls:
                logger.info(f"  [SUBAGENT:{cfg.id}] tool_call: {tc.get('name')}")

        return {"pending_agent_message": None, "messages": [response]}

    subagent_node.__name__ = f"subagent_{cfg.id}"
    return subagent_node


def route_subagent(state: OrchestratorState):
    """Generic route for any subagent: tool call → tools_node, else → END."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


# ---------------------------------------------------------------------------
# Shared tools node — generic, driven by registry
# ---------------------------------------------------------------------------

async def tools_node(state: OrchestratorState) -> dict:
    """Unified tool executor. Handles all backend tool calls from any node.

    State-mutating tools are handled inline; domain tools whose return values
    update widget_state are called and merged generically.
    """
    last = state["messages"][-1]
    tool_names = [tc["name"] for tc in getattr(last, "tool_calls", [])]
    logger.info(f"[TOOLS] entering tools_node — calls: {tool_names} focused={state.get('focused_agent')}")
    messages = []
    state_updates: dict = {}

    for tc in last.tool_calls:
        name = tc["name"]

        if name == "clear_canvas":
            ids = tc["args"].get("widget_ids") or None
            if ids is not None and len(ids) == 0:
                ids = None
            state_updates["canvas_clear"] = {"ids": ids, "seq": int(time.time() * 1000)}
            current_active = list(state.get("active_widgets") or [])
            state_updates["active_widgets"] = [] if ids is None else [
                w for w in current_active if w not in ids
            ]
            logger.info(f"[TOOLS] clear_canvas ids={ids}")
            messages.append(ToolMessage(
                content=json.dumps({"cleared": ids if ids else "all"}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name in _spawn_tool_map:
            cfg = _spawn_tool_map[name]
            # Call the spawn tool — its return value is the initial widget_state
            initial_ws = cfg.spawn_tool.func(**tc["args"])
            if not isinstance(initial_ws, dict):
                initial_ws = {}
            state_updates["focused_agent"] = cfg.id
            state_updates["widget_state"] = initial_ws
            current_active = list(state.get("active_widgets") or [])
            if cfg.id not in current_active:
                current_active.append(cfg.id)
            state_updates["active_widgets"] = current_active
            if cfg.intro_message:
                state_updates["pending_agent_message"] = cfg.intro_message
            logger.info(f"[TOOLS] spawn '{name}' → focused_agent={cfg.id} intro={bool(cfg.intro_message)}")
            messages.append(ToolMessage(
                content=json.dumps({"spawned": cfg.id, **initial_ws}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name == "handoff_to_orchestrator":
            prev_agent = state.get("focused_agent")
            summary = tc["args"].get("summary", "")
            state_updates["focused_agent"] = None
            if summary:
                state_updates["pending_agent_message"] = f"[Handoff from {prev_agent}]: {summary}"
            logger.info(f"[TOOLS] handoff_to_orchestrator: {prev_agent} → orchestrator summary={bool(summary)}")
            messages.append(ToolMessage(
                content=json.dumps({"status": "handing_off"}),
                tool_call_id=tc["id"], name=name,
            ))

        elif name in _domain_tool_map:
            fn = _domain_tool_map[name]
            result = fn.func(**tc["args"])
            # Merge result dict into widget_state
            if isinstance(result, dict) and "error" not in result:
                current_ws = dict(state.get("widget_state") or {})
                current_ws.update(result)
                state_updates["widget_state"] = current_ws
                logger.info(f"[TOOLS] domain '{name}' → widget_state={current_ws}")
            messages.append(ToolMessage(
                content=json.dumps(result) if isinstance(result, dict) else str(result),
                tool_call_id=tc["id"], name=name,
            ))

        else:
            # Frontend tool — skip execution, AG-UI protocol routes to client
            logger.info(f"[TOOLS] skipping frontend tool: {name}")

    return {**state_updates, "messages": messages}


# ---------------------------------------------------------------------------
# Entry and post-tools routing — generic
# ---------------------------------------------------------------------------

def route_entry(state: OrchestratorState):
    focused = state.get("focused_agent")
    if focused and focused in _registry:
        logger.info(f"[ENTRY] resuming subagent '{focused}'")
        return focused
    return "orchestrator"


def route_after_tools(state: OrchestratorState):
    # Detect if we just ran a spawn tool
    messages = state["messages"]
    for msg in reversed(messages):
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            if any(tc.get("name") in _spawn_tool_map for tc in msg.tool_calls):
                focused = state.get("focused_agent")
                if state.get("pending_agent_message") and focused and focused in _registry:
                    logger.info(f"[TOOLS] spawn + intro → subagent '{focused}' for greeting")
                    return focused
                logger.info("[TOOLS] spawn complete → END (subagent activates next turn)")
                return END
            break

    focused = state.get("focused_agent")
    if focused and focused in _registry:
        logger.info(f"[TOOLS] → subagent '{focused}'")
        return focused
    logger.info("[TOOLS] → orchestrator")
    return "orchestrator"


# ---------------------------------------------------------------------------
# Graph assembly — dynamic, driven by registry
# ---------------------------------------------------------------------------

def create_graph():
    workflow = StateGraph(OrchestratorState)

    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("tools", tools_node)

    subagent_ids = list(_registry.keys())

    # Add one node per registered subagent
    for subagent_id, cfg in _registry.items():
        workflow.add_node(subagent_id, make_subagent_node(cfg))
        workflow.add_conditional_edges(subagent_id, route_subagent, {
            "tools": "tools",
            END: END,
        })

    # Entry: resume active subagent or go to orchestrator
    entry_targets = {"orchestrator": "orchestrator", **{sid: sid for sid in subagent_ids}}
    workflow.add_conditional_edges(START, route_entry, entry_targets)

    # Orchestrator: backend call → tools, else → END
    workflow.add_conditional_edges("orchestrator", route_orchestrator, {
        "tools": "tools",
        END: END,
    })

    # After tools: route to active subagent, back to orchestrator, or END (after spawn)
    after_targets = {"orchestrator": "orchestrator", END: END, **{sid: sid for sid in subagent_ids}}
    workflow.add_conditional_edges("tools", route_after_tools, after_targets)

    return workflow.compile(
        checkpointer=MemorySaver(),
    ).with_config({"recursion_limit": 25})


graph = create_graph()
