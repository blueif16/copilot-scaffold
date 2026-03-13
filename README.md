# CopilotKit + LangGraph Full-Stack Agent Scaffold

Production-ready scaffold for building full-stack AI agents with CopilotKit frontend integration and LangGraph backend orchestration.

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
# Add your OPENAI_API_KEY
```

3. **Run development servers**:
```bash
npm run dev
```

This starts:
- Next.js frontend on http://localhost:3000
- FastAPI backend on http://localhost:8123

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

## License

MIT
