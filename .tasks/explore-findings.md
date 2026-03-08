# Slice 11 Exploration Findings: Course Builder Agent Tools + Preview

**Date:** 2026-03-07  
**Scope:** Existing agent patterns, API routes, course builder UI, Supabase integration, dependencies

---

## 1. Existing Agent Patterns

### Location
- **Agent graphs:** `/Users/tk/Desktop/Omniscience/agent/graphs/`
  - `observation.py` — Processes simulation events, routes to AI or programmed reactions
  - `chat.py` — Conversational responses for student questions
- **Agent main:** `/Users/tk/Desktop/Omniscience/agent/main.py`
- **Topic configs:** `/Users/tk/Desktop/Omniscience/agent/topics/{topic_id}/`
  - `config.py` — TopicConfig with pedagogical prompts, knowledge context, chat system prompt
  - `reactions.py` — ReactionRegistry with programmed event→reaction mappings

### Agent Structure Pattern

**Graph Architecture:**
- Uses LangGraph with StateGraph + MemorySaver checkpointer
- State extends `CopilotKitState` (provides `messages` + `copilotkit` context)
- Nodes are async functions that return dict updates
- Command routing for conditional edges (no explicit conditional_edge calls)

**Observation Agent (observation.py):**
```python
# State: ObservationAgentState
# Nodes: event_classifier → reaction_lookup → [ai_reasoning] → deliver_reaction
# Flow:
# 1. event_classifier: Enriches event with occurrence count
# 2. reaction_lookup: Checks ReactionRegistry, routes via Command
#    - If match + no escalate → deliver_reaction (programmed)
#    - If no match or escalate → ai_reasoning (LLM)
# 3. ai_reasoning: Uses Gemini 2.5 Flash with emit_reaction tool
# 4. deliver_reaction: Writes to companion state, emits via copilotkit_emit_state
```

**Chat Agent (chat.py):**
```python
# State: ChatAgentState
# Single node: conversational_response
# Uses Gemini 2.5 Flash Lite (cheaper, faster for kids)
# System prompt includes: simulation state, recent events, progress, reaction history
```

### Key Patterns to Follow

1. **Config via Closure:** TopicConfig and ReactionRegistry are captured by closure, never in graph state
2. **State Zones:** Observation agent writes to simulation+events (Zone 1), backend writes to companion (Zone 2)
3. **Tool Factory:** `make_emit_reaction_tool()` creates constrained tool with allowed emotions/animations
4. **Error Handling:** Catch exceptions, return fallback, don't propagate (prevents RUN_ERROR terminal state)
5. **Async Nodes:** Use `async def` for LLM calls, pass `config: RunnableConfig`
6. **Emit State:** Use `copilotkit_emit_state(config, {...})` to push updates to frontend immediately

### Agent Registration (main.py)

```python
# Pattern: Build graph with config, wrap in LangGraphAGUIAgent, register with add_langgraph_fastapi_endpoint
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
)
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="observation-changing-states",
        description="...",
        graph=observation_graph_changing_states,
    ),
    path="/agents/observation-changing-states",
)
```

**Naming Convention:** `{agent_type}-{topic_id}` (e.g., `observation-changing-states`, `chat-changing-states`)

### ReAct Pattern

Not explicitly used. Instead:
- **Programmed Reactions:** EventPattern matching with conditions (supports `__gte`, `__lte`, `__in` operators)
- **Escalation to AI:** Reactions can set `escalate_to_ai=True` with `ai_hint` for LLM context
- **Tool Calls:** AI uses `emit_reaction` tool to generate reactions

---

## 2. API Route Patterns

### Location
- **Next.js API routes:** `/Users/tk/Desktop/Omniscience/app/api/`
  - `copilotkit/route.ts` — Main CopilotKit endpoint
  - `voice/route.ts` — Voice API
  - `auth/callback/route.ts` — OAuth callback

### CopilotKit Route Pattern (copilotkit/route.ts)

```typescript
// 1. Create CopilotRuntime with agents
const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/observation-changing-states`,
    }),
    "chat-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/chat-changing-states`,
    }),
    // ... more agents
  },
});

// 2. Handle POST requests
export const POST = async (req: NextRequest) => {
  const body = await req.text();
  const newReq = new NextRequest(req.url, {
    method: req.method,
    headers: req.headers,
    body: body,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return await handleRequest(newReq);
};
```

### Backend URL Resolution
- Frontend env: `BACKEND_URL` (default: `http://localhost:8123`)
- Docker: `http://backend:8123` (set in docker-compose.yml)
- Agents exposed at: `{BACKEND_URL}/agents/{agent_name}`

### Authentication/Session Handling

**Frontend:**
- Uses Supabase SSR client (`@supabase/ssr`)
- `createSupabaseBrowser()` — Browser client
- `createSupabaseServer()` — Server client with cookie handling
- Auth context in `/Users/tk/Desktop/Omniscience/contexts/AuthContext.tsx`

**Backend:**
- Middleware: `/Users/tk/Desktop/Omniscience/agent/middleware.py` (FixAGUIProtocolMiddleware)
- Auth dependency: `get_current_user` (optional, returns 401 if not authenticated)
- Example protected endpoint: `/me` (returns user id, email, role, display_name)

### Error Handling Patterns

- Middleware fixes protocol issues (missing threadId, runId, state, tools, context, forwardedProps, message ids)
- Agents catch exceptions and return fallback responses
- No propagation of errors to prevent RUN_ERROR terminal state

---

## 3. Course Builder UI

### Location
- **Component:** `/Users/tk/Desktop/Omniscience/components/teacher/CourseBuilder.tsx`
- **Page:** `/Users/tk/Desktop/Omniscience/app/(teacher)/courses/new/page.tsx`
- **Types:** `/Users/tk/Desktop/Omniscience/lib/types/course-builder.ts`

### Current State (Slice 10)

**Phases:**
1. **landing** — Template selection + free-form input
2. **chat** — Chat-only interface (full height)
3. **split** — Chat on left (50%), Sandpack preview on right (50%)

**Templates:**
```typescript
const TEMPLATES: CourseTemplate[] = [
  { id: "water-cycle", name: "Water Cycle", format: "lab", ... },
  { id: "solar-system", name: "Solar System", format: "lab", ... },
  { id: "photosynthesis", name: "Photosynthesis", format: "dialogue", ... },
];
```

**State Management:**
```typescript
const [phase, setPhase] = useState<BuilderPhase>("landing");
const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [files, setFiles] = useState<Record<string, string>>({});
```

**Chat Integration:**
- Currently simulated with 1s timeout
- Placeholder for actual API call in Slice 11
- Messages sent/received via state updates

**Sandpack Integration:**
```typescript
<SandpackProvider template="react" files={files} theme="light">
  <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={true} />
</SandpackProvider>
```

### Key Patterns to Follow

1. **Phase Transitions:** Use AnimatePresence + motion.div for smooth transitions
2. **Message Rendering:** Map messages array, distinguish user vs assistant
3. **Loading State:** Show animated dots while waiting for response
4. **File Updates:** Update `files` state to trigger Sandpack re-render
5. **Input Handling:** Trim, check isLoading, use Enter key for send
6. **Auto-scroll:** useEffect with messagesEndRef.scrollIntoView()

### Missing Pieces for Slice 11

1. **API endpoint** to send chat messages to course builder agent
2. **Agent integration** — Course Builder Agent that:
   - Takes user message + template context
   - Generates JSX code for Sandpack
   - Returns structured response (message + files)
3. **File update logic** — Trigger split view when files are generated
4. **Save/publish flow** — Store course to Supabase

---

## 4. Supabase Integration

### Location
- **Client setup:** `/Users/tk/Desktop/Omniscience/lib/supabase/client.ts`
- **Server setup:** `/Users/tk/Desktop/Omniscience/lib/supabase/server.ts`
- **Migrations:** `/Users/tk/Desktop/Omniscience/supabase/migrations/`
- **Docker config:** `/Users/tk/Desktop/Omniscience/docker-compose.yml`

### Schema (from 20260307000000_auth_profiles.sql)

**profiles table:**
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text CHECK (role IN ('student', 'teacher')) NOT NULL DEFAULT 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,  -- For Slice 12 (memory)
  created_at timestamptz DEFAULT now()
);
-- RLS: Users can read/update own profile
```

**courses table:**
```sql
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  format text CHECK (format IN ('lab', 'quiz')) NOT NULL DEFAULT 'lab',
  age_range int4range,
  status text CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  simulation_jsx text,              -- Single JSX source for Sandpack
  interactions_json jsonb,          -- Event→Reaction mappings
  companion_config jsonb,           -- Companion personality, knowledge context
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: Teachers CRUD own courses, students read published
-- Indexes: teacher_id, status
```

**student_progress table:**
```sql
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  thread_id uuid,                    -- CopilotKit session
  progress_data jsonb DEFAULT '{}',
  reaction_history text[] DEFAULT '{}',
  last_active timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);
-- RLS: Students own their progress
-- Indexes: student_id, course_id, last_active
```

### Client Usage Pattern

**Browser:**
```typescript
import { createSupabaseBrowser } from "@/lib/supabase/client";
const supabase = createSupabaseBrowser();
const { data, error } = await supabase
  .from("courses")
  .select("*")
  .eq("teacher_id", userId);
```

**Server:**
```typescript
import { createSupabaseServer } from "@/lib/supabase/server";
const supabase = await createSupabaseServer();
const { data, error } = await supabase
  .from("courses")
  .insert([{ teacher_id, title, ... }]);
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
USE_SELFHOSTED_SUPABASE=false  # Set true for Docker Compose
```

### Self-Hosted Supabase (Docker)

Services in docker-compose.yml:
- `supabase-db` (PostgreSQL 15.1)
- `supabase-auth` (GoTrue)
- `supabase-rest` (PostgREST)
- `supabase-realtime`
- `supabase-storage`
- `kong` (API Gateway on port 8000)
- `supabase-studio` (Web UI on port 3000)

---

## 5. Dependencies

### Python (agent/pyproject.toml)

```toml
dependencies = [
    "copilotkit>=0.1.30",
    "langgraph>=0.2.0",
    "langchain-core>=0.3.0",
    "langchain-google-genai>=2.1.0",  # Gemini SDK
    "supabase>=2.0.0",
    "letta-client>=0.1.0",  # For Slice 12
]
```

**Key versions:**
- LangGraph: 0.2.0+ (for Command routing)
- LangChain: 0.3.0+ (for tool binding)
- Gemini SDK: 2.1.0+ (for ChatGoogleGenerativeAI)

### Frontend (package.json)

```json
{
  "@codesandbox/sandpack-react": "^2.20.0",
  "@copilotkit/react-core": "^1.8.16",
  "@copilotkit/react-ui": "^1.8.16",
  "@copilotkit/runtime": "^1.8.16",
  "@copilotkit/runtime-client-gql": "^1.8.16",
  "@google/genai": "^1.44.0",
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.98.0",
  "framer-motion": "^11.18.0",
  "next": "14.2.29",
  "react": "^18.3.1"
}
```

**Key versions:**
- CopilotKit: 1.8.16 (for useCoAgent, useCopilotChat, useCopilotAction)
- Sandpack: 2.20.0 (for React template preview)
- Supabase: 2.98.0 (for auth + database)

### Gemini SDK Status

✅ **Already installed:**
- Python: `langchain-google-genai>=2.1.0`
- Frontend: `@google/genai>=1.44.0`

**Models used:**
- Observation agent: `gemini-2.5-flash` (AI reasoning)
- Chat agent: `gemini-2.5-flash-lite` (fast, cheap)
- Course builder agent: TBD (likely `gemini-2.5-flash` for code generation)

---

## 6. Integration Points for Slice 11

### Frontend → Backend Flow

1. **User sends message in CourseBuilder**
   - POST to `/api/copilotkit` with message
   - CopilotKit runtime routes to `course-builder-agent`
   - Backend agent receives via LangGraphHttpAgent

2. **Course Builder Agent**
   - Receives: user message, template context, previous messages
   - Generates: JSX code for Sandpack
   - Returns: structured response (message + files dict)

3. **Frontend receives response**
   - Updates `messages` state
   - Updates `files` state (triggers Sandpack re-render)
   - Transitions to `split` phase if files generated

4. **Save to Supabase**
   - User clicks "Save Draft"
   - POST to backend endpoint (TBD)
   - Inserts/updates `courses` table with:
     - `simulation_jsx` (from files["/App.tsx"])
     - `interactions_json` (if agent generates reactions)
     - `companion_config` (if agent generates personality)

### Backend Architecture

**New agent needed:**
- Name: `course-builder-agent`
- Type: Single-node graph (like chat agent)
- Model: Gemini 2.5 Flash
- Inputs: user message, template, conversation history
- Outputs: JSX code + companion config (optional)
- Tools: None (pure generation, no tool calls)

**New API endpoint needed:**
- POST `/courses` — Save draft course
- GET `/courses/{id}` — Fetch course
- PUT `/courses/{id}` — Update course
- DELETE `/courses/{id}` — Delete course

---

## 7. Gotchas & Constraints

### Agent-Specific

1. **State Zones:** Observation agent must NOT write to companion state directly. Use `copilotkit_emit_state()` instead.
2. **Cooldowns:** Use event timestamps, not wall-clock time (for checkpoint safety)
3. **One-shot reactions:** Track in `_fired` dict, check before matching
4. **Error handling:** Always catch exceptions in async nodes, return fallback
5. **Tool constraints:** `make_emit_reaction_tool()` validates emotions/animations against allowed lists

### CopilotKit-Specific

1. **Message IDs:** All messages must have `id` field (middleware adds if missing)
2. **Context field:** Must be `[]` not `{}` (middleware fixes)
3. **ThreadId/RunId:** Must be present (middleware generates if missing)
4. **Emit state:** Only works inside async nodes with `config` parameter
5. **Chat availability:** Check `chatIsAvailable` before sending messages

### Supabase-Specific

1. **RLS policies:** Must enable RLS on all tables, define policies explicitly
2. **Triggers:** Auto-create profile on signup, auto-update `updated_at` on course changes
3. **Self-hosted:** Kong gateway on port 8000, Studio on port 3000
4. **Migrations:** Run in order, check for existing tables before creating

### Sandpack-Specific

1. **Template:** Only `"react"` template supported in current setup
2. **Files:** Must include `/App.tsx` or `/index.tsx` as entry point
3. **Re-render:** Triggered by `files` state change, not individual file updates
4. **Preview:** Runs in iframe, has access to npm packages in template

---

## 8. File Structure Summary

```
/Users/tk/Desktop/Omniscience/
├── agent/
│   ├── main.py                          # Agent registration
│   ├── config.py                        # Env loading
│   ├── models.py                        # Universal types (SimulationEvent, Reaction, etc.)
│   ├── middleware.py                    # Protocol fixes
│   ├── graphs/
│   │   ├── observation.py               # Observation agent graph
│   │   └── chat.py                      # Chat agent graph
│   └── topics/
│       ├── changing_states/
│       │   ├── config.py                # TopicConfig
│       │   └── reactions.py             # ReactionRegistry
│       ├── electric_circuits/
│       └── genetics_basics/
├── app/
│   ├── api/
│   │   ├── copilotkit/route.ts          # CopilotKit endpoint
│   │   ├── voice/route.ts
│   │   └── auth/callback/route.ts
│   ├── (teacher)/
│   │   ├── courses/new/page.tsx         # Course builder page
│   │   └── layout.tsx
│   ├── (student)/
│   │   ├── topics/changing-states/page.tsx
│   │   └── layout.tsx
│   └── layout.tsx                       # Root layout (AuthProvider, LocaleProvider)
├── components/
│   ├── teacher/
│   │   ├── CourseBuilder.tsx            # Main builder component
│   │   ├── TemplateCard.tsx
│   │   └── CourseCard.tsx
│   ├── simulations/
│   │   ├── ChangingStatesSimulation.tsx
│   │   ├── ElectricCircuitsSimulation.tsx
│   │   └── GeneticsBasicsSimulation.tsx
│   ├── chat/ChatOverlay.tsx
│   ├── companion/Companion.tsx
│   └── spotlight/SpotlightCard.tsx
├── framework/
│   ├── TopicRunner.tsx                  # Main agent orchestration
│   ├── TopicPageLayout.tsx              # Page wrapper with CopilotKit
│   └── SoundManager.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser client
│   │   └── server.ts                    # Server client
│   ├── types/
│   │   ├── course-builder.ts            # CourseTemplate, ChatMessage, etc.
│   │   ├── changing-states.ts
│   │   ├── electric-circuits.ts
│   │   └── genetics-basics.ts
│   ├── topics/
│   │   ├── changing-states/config.ts    # Frontend topic config
│   │   └── index.ts
│   └── session.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── LocaleContext.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 20240307000000_create_profiles.sql
│   │   └── 20260307000000_auth_profiles.sql
│   └── kong.yml
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── package.json
└── agent/pyproject.toml
```

---

## 9. Next Steps for Slice 11

1. **Create Course Builder Agent**
   - File: `/Users/tk/Desktop/Omniscience/agent/graphs/course_builder.py`
   - Pattern: Single-node graph like chat agent
   - Input: user message, template, conversation history
   - Output: JSX code + optional companion config

2. **Register Agent in main.py**
   - Add to agent dict in CopilotRuntime
   - Register with add_langgraph_fastapi_endpoint

3. **Create API Endpoints**
   - POST `/api/courses` — Save draft
   - GET `/api/courses/{id}` — Fetch
   - PUT `/api/courses/{id}` — Update
   - DELETE `/api/courses/{id}` — Delete

4. **Integrate with CourseBuilder Component**
   - Replace simulated response with actual API call
   - Handle file updates from agent response
   - Trigger split view transition

5. **Add Save/Publish Flow**
   - "Save Draft" button → POST to `/api/courses`
   - Store to Supabase `courses` table
   - Show success/error toast

6. **Testing**
   - Test agent with various templates
   - Test file generation and Sandpack rendering
   - Test Supabase save/load flow
   - Test RLS policies for teacher/student access

