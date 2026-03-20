# CopilotKit + LangGraph Full-Stack Agent Scaffold

Production-ready scaffold for building full-stack AI agents with CopilotKit frontend integration and LangGraph backend orchestration.

## Pinned Versions (Breaking Change Notice)

| Package | Pinned Version | Reason |
|---|---|---|
| `copilotkit` | `==0.1.75` | v0.1.76+ broke import: `langchain.agents.middleware` removed |
| `ag-ui-langgraph` | `>=0.0.26` | AG-UI/SSE protocol; pulled in transitively by copilotkit but declared explicitly |
| `langgraph` | `>=0.3.25,<1.1.0` | Required by copilotkit 0.1.75 |

**Backend API**: `add_langgraph_fastapi_endpoint` from `ag_ui_langgraph` + `LangGraphAGUIAgent` from `copilotkit`

**Frontend API**: `LangGraphHttpAgent` from `@copilotkit/runtime/langgraph` + `@copilotkit/react-core` `1.54.0`

Do **not** upgrade `copilotkit` past `0.1.75` until the upstream import bug is resolved.

## Features

- **Frontend**: Next.js 15 + React 19 + TypeScript + CopilotKit
- **Backend**: Python + LangGraph + FastAPI
- **State Sync**: Bidirectional state synchronization between frontend and agent
- **Type Safety**: Full TypeScript and Python type checking
- **Data-First**: Verified API patterns using Context7 documentation

## Project Structure

```
copilot-scaffold/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/copilotkit/    # CopilotKit runtime endpoint
│   │   ├── layout.tsx         # Root layout with CopilotKit provider
│   │   └── page.tsx           # Main page with chat UI
│   └── components/            # React components
├── backend/
│   ├── agent/                 # LangGraph agent implementation
│   │   ├── graph.py          # StateGraph definition
│   │   ├── state.py          # State schema
│   │   └── tools.py          # Backend tools
│   ├── server.py             # FastAPI server
│   └── pyproject.toml        # Python dependencies
├── tests/                     # Integration tests
└── package.json              # Node dependencies
```

## Quick Start

1. **Install dependencies**:
```bash
npm install
cd backend && pip install -e .
```

2. **Set up environment**:
```bash
cp .env.example .env
# Add your GOOGLE_API_KEY or OPENAI_API_KEY
```

3. **Run development servers**:
```bash
# Terminal 1: Backend (port 8000)
cd backend && source venv/bin/activate && python server.py

# Terminal 2: Frontend (port 3000)
npm run dev
```

Or use the startup script (runs both):
```bash
./startup.sh
```

This starts:
- Next.js frontend on http://localhost:3000
- FastAPI backend on http://localhost:8000

## Usage

### Frontend Actions

Use `useCopilotAction` to define actions the agent can call:

```typescript
useCopilotAction({
  name: "updateUI",
  description: "Update the UI state",
  parameters: z.object({
    value: z.string(),
  }),
  handler: async ({ value }) => {
    setState(value);
  },
});
```

### Shared State

Use `useCoAgent` for bidirectional state sync:

```typescript
const { state, setState } = useCoAgent<AgentState>({
  name: "my_agent",
  initialState: { items: [] },
});
```

### Backend Tools

Define tools in `backend/agent/tools.py`:

```python
@tool
def my_tool(param: str) -> str:
    """Tool description for the agent."""
    return f"Result: {param}"
```

## Testing

```bash
npm test                    # Frontend tests
cd backend && pytest       # Backend tests
```

## Deployment

See deployment guides for:
- Vercel (frontend)
- LangGraph Cloud (backend)
- Self-hosted options

---

## Tool Registration Pipeline — Architecture & Bug Record

### Full Pipeline (verified 2026-03-19)

This documents the exact path frontend tools travel from React hook to Python LLM binding, and the bug that caused tools to arrive empty.

```
[1] useFrontendTool (WidgetToolRegistrar)
      ↓  copilotkit.addTool(tool)
      ↓  pushes to copilotkit.runHandler._tools[]

[2] copilotkit.runAgent({ agent })          ← CORRECT call site
      ↓  RunHandler.runAgent()
      ↓  buildFrontendTools(agent.agentId)
      ↓  filters _tools where (!tool.agentId || tool.agentId === agentId)
      ↓  maps to { name, description, parameters: jsonSchema }
      ↓  passes as tools[] in RunAgentInput

[3] ProxiedCopilotRuntimeAgent.run(input)
      ↓  HttpAgent serializes full RunAgentInput as JSON POST body
      ↓  POST /api/copilotkit/agent/orchestrator/run
      ↓  body: { threadId, runId, tools: [...], messages, state, ... }

[4] route.ts  (Next.js catch-all /api/copilotkit/[[...path]])
      ↓  clones request, logs body.tools count + names
      ↓  forwards to createCopilotEndpoint → handle-run.mjs

[5] handle-run.mjs
      ↓  RunAgentInputSchema.parse(body)  (Zod validation)
      ↓  agent.run(input)  → HttpAgent → POST http://localhost:8000/copilotkit

[6] backend/server.py  (FastAPI middleware)
      ↓  logs parsed body: tools[], full keys
      ↓  forwards to add_langgraph_fastapi_endpoint

[7] LangGraphAGUIAgent → ag_ui_langgraph
      ↓  deserializes RunAgentInput.tools → frontend actions
      ↓  populates state["copilotkit"]["actions"]

[8] backend/agent/graph.py  orchestrator_node
      ↓  frontend_actions = state["copilotkit"]["actions"]
      ↓  all_tools = [*frontend_actions, *backend_tools]
      ↓  llm.bind_tools(all_tools)
      ↓  LLM can now call show_topic_progress / show_user_card / show_particle_sim
```

**Verified log sequence (working):**
```
[WT]   addTool effect fired: name=show_topic_progress total_tools=1
[WT]   addTool effect fired: name=show_user_card      total_tools=2
[WT]   addTool effect fired: name=show_particle_sim   total_tools=3
[BOOT] firing auto-message, tools registered: 3
[route.ts] body.tools: count=3 names=show_topic_progress,show_user_card,show_particle_sim
[server]   RAW tools count: 3
[GRAPH]    frontend actions count: 3
[GRAPH]    Binding 4 tools to LLM (3 frontend + 1 backend)
LLM RESPONSE: tool_calls to frontend widgets
```

---

### Bug: tools arrived as `[]` at Python backend

**Symptom:** Frontend registered 3 tools. Python logged `frontend actions count: 0`. Agent responded in plain text instead of calling widget tools.

**Root cause:** `agent.runAgent()` was called directly on the `ProxiedCopilotRuntimeAgent` with no arguments. This bypasses the `CopilotKitCore.runAgent()` wrapper that injects tools.

```
// WRONG — tools never injected, tools:[] in POST body
v2Agent.runAgent()

// CORRECT — goes through RunHandler.buildFrontendTools(agentId)
copilotkit.runAgent({ agent: v2Agent })
```

**Internal path (why it matters):**
- `agent.runAgent()` → `AbstractAgent.runAgent(options?)` → options undefined → `tools: []` serialized
- `copilotkit.runAgent({ agent })` → `RunHandler.runAgent()` → `buildFrontendTools(agentId)` → reads `_tools[]` → passes populated array

**Affected files (fixed):**
- `src/components/chat.tsx` — `v2Agent.runAgent()` → `copilotkit.runAgent({ agent: v2Agent })`
- `src/components/ChatSidebar.tsx` — `agent.runAgent()` → `copilotkit.runAgent({ agent })`
- `src/app/(chat)/page.tsx` — boot message `agent.runAgent()` → `copilotkit.runAgent({ agent })`

**Prevention:** Never call `.runAgent()` directly on a `ProxiedCopilotRuntimeAgent` / `HttpAgent` instance. Always go through `copilotkit.runAgent({ agent })` from `useCopilotKit()`.

---

### Key internal types (copilotkitnext v2)

| Symbol | Package | Role |
|---|---|---|
| `useFrontendTool` | `@copilotkitnext/react` | Registers tool into `copilotkit.runHandler._tools[]` via useEffect |
| `useCopilotKit()` | `@copilotkitnext/react` | Returns `{ copilotkit: CopilotKitCoreReact }` |
| `copilotkit.runAgent({ agent })` | `@copilotkitnext/core` | Injects tools, runs agent |
| `buildFrontendTools(agentId)` | `@copilotkitnext/core` | Filters `_tools` where `!tool.agentId \|\| tool.agentId === agentId` |
| `RunAgentInput.tools` | `@ag-ui/client` | Wire format — JSON array of `{ name, description, parameters }` |
| `state["copilotkit"]["actions"]` | `copilotkit` Python SDK | Deserialized frontend tools inside LangGraph state |
| `CopilotKitState` | `copilotkit` Python SDK | Base state class providing `messages` + `copilotkit` keys |

---

## Canvas Clear — Backend Tool → Frontend State Pattern

### How it works

The agent can remove widgets from the canvas via a backend tool (`clear_canvas`) that writes directly into LangGraph state. The frontend subscribes to state changes and calls `setSpawned` accordingly.

```
[1] LLM calls clear_canvas(widget_ids?)
      ↓  routed to backend (clear_canvas is in backend_tool_names)

[2] tools_node (graph.py) — intercepts before executing
      ↓  writes state["canvas_clear"] = { ids: [...] | null, seq: <timestamp> }
      ↓  adds ToolMessage with result (LLM sees confirmation)

[3] AG-UI protocol streams updated state to frontend
      ↓  onStateChanged fires with new canvas_clear signal

[4] page.tsx useEffect — agent.subscribe({ onStateChanged })
      ↓  reads canvas_clear.ids
      ↓  ids null/empty → setSpawned([])           (clear all)
      ↓  ids present   → setSpawned(prev.filter())  (remove specific)
```

### Why backend not frontend tool

A `useFrontendTool` for `clear_canvas` never reaches the LLM reliably because it isn't registered through the `WidgetToolRegistrar` pattern (which mounts tools at page root). A backend tool is always visible to the LLM via `backend_tools` and routes through the custom `tools_node` which can write arbitrary state.

### Usage by the agent

- **Switch views**: `clear_canvas()` (no args) + new widget tools — in one response
- **Replace one widget**: `clear_canvas(widget_ids=["user_card"])` + `show_user_card(...)` — in one response
- **Add alongside existing**: just call the new widget tool, no clear needed

### Files changed

| File | Change |
|---|---|
| `backend/agent/tools.py` | Added `clear_canvas` backend tool |
| `backend/agent/graph.py` | Custom `tools_node` intercepts call, writes `canvas_clear` to state |
| `backend/agent/state.py` | Added `canvas_clear: Optional[Dict]` field |
| `src/app/(chat)/page.tsx` | `useEffect` subscribes to `onStateChanged`, reacts to `canvas_clear` |

## License

MIT
