# Slice 12 Exploration Report: Letta Integration

**Date:** 2026-03-07  
**Scope:** Current codebase structure for Letta (student memory) integration  
**Status:** Read-only exploration complete

---

## 1. Docker Compose Structure

**File:** `/Users/tk/Desktop/Omniscience/docker-compose.yml`

### Current Services (9 total)
- **supabase-db** (PostgreSQL 15.1.0.147) — Port 5432
- **supabase-studio** (Web UI) — Port 3000
- **kong** (API Gateway) — Ports 8000, 8443
- **supabase-auth** (GoTrue v2.132.3) — Port 9999
- **supabase-rest** (PostgREST v11.2.2) — Port 3000
- **supabase-realtime** (v2.25.50) — Port 4000
- **supabase-storage** (v0.43.11) — Port 5000
- **imgproxy** (v3.8.0) — Port 5001
- **supabase-meta** (v0.75.0) — Port 8080
- **backend** (FastAPI) — Port 8124 (maps to 8123 internal)
- **frontend** (Next.js) — Port 3082 (maps to 3000 internal)

### Missing for Slice 12
- **Letta service** — NOT YET in docker-compose.yml
- Expected: `letta` service on port 8283 (self-hosted Letta server)
- Architecture doc specifies: `LETTA_BASE_URL=http://letta:8283`

---

## 2. Database Schema (Profiles Table)

**Files:**
- `/Users/tk/Desktop/Omniscience/supabase/migrations/20240307000000_create_profiles.sql`
- `/Users/tk/Desktop/Omniscience/supabase/migrations/20260307000000_auth_profiles.sql`

### Current Schema
```sql
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher')) not null default 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,          -- Letta agent ID for this student's memory (Slice 12)
  created_at timestamptz default now()
);
```

### Key Points
- `letta_agent_id` column already exists (prepared for Slice 12)
- RLS policies in place: users can read/update own profile
- Trigger `handle_new_user()` auto-creates profile on signup with role from metadata
- Index on `role` for performance

### Related Tables (for context)
- **courses** — Teacher-created courses (format: lab/quiz, simulation_jsx, interactions_json, companion_config)
- **student_progress** — Per-student course tracking (thread_id, progress_data, reaction_history)

---

## 3. Agent Directory Structure

**Root:** `/Users/tk/Desktop/Omniscience/agent/`

### Directory Tree
```
agent/
├── __init__.py
├── config.py                    # Environment loading, .env resolution
├── models.py                    # Universal types (SimulationEvent, ReactionPayload, TopicConfig, etc.)
├── main.py                      # FastAPI app + agent registration
├── middleware.py                # (legacy, see middleware/auth.py)
├── middleware/
│   ├── __init__.py
│   └── auth.py                  # JWT verification, get_current_user dependency
├── lib/
│   ├── __init__.py
│   └── supabase_client.py       # get_supabase_client() — service role key
├── graphs/
│   ├── __init__.py
│   ├── observation.py           # Event classifier → reaction lookup → AI reasoning → deliver
│   └── chat.py                  # Conversational responses with simulation context
├── topics/
│   ├── __init__.py
│   ├── changing_states/
│   │   ├── __init__.py
│   │   ├── config.py            # TopicConfig (pedagogical_prompt, knowledge_context, etc.)
│   │   └── reactions.py         # ReactionRegistry with 20+ programmed reactions
│   ├── electric_circuits/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── reactions.py
│   └── genetics_basics/
│       ├── __init__.py
│       ├── config.py
│       └── reactions.py
├── tools/
│   ├── __init__.py
│   └── emit_reaction.py         # Tool factory for AI to emit reactions
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_reaction_lookup.py
│   ├── test_chat_graph.py
│   └── fixtures/
│       ├── __init__.py
│       └── sample_events.py
├── test_*.py                    # Integration tests (5 files)
└── pyproject.toml               # Dependencies: copilotkit, langgraph, langchain-google-genai, supabase
```

### Key Files for Slice 12
- **agent/lib/supabase_client.py** — Existing Supabase integration (service role)
- **agent/middleware/auth.py** — JWT verification, user profile fetching
- **agent/main.py** — Agent registration pattern (add Letta client here)
- **agent/graphs/observation.py** — Where memory context will be injected
- **agent/graphs/chat.py** — Where memory context will be injected

---

## 4. Student Signup Flow

**Frontend:** `/Users/tk/Desktop/Omniscience/app/(auth)/signup/page.tsx`

### Current Implementation
```typescript
// Client-side signup
const handleSignup = async (e: React.FormEvent) => {
  const supabase = createSupabaseBrowser();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },  // Passed to auth.users.raw_user_meta_data
    },
  });
  
  // Redirect to home on success
  router.push("/");
  router.refresh();
};
```

### Signup Flow Steps
1. User enters email, password, selects role (student/teacher)
2. Supabase auth.signUp() creates auth.users record
3. Trigger `handle_new_user()` fires on auth.users INSERT
4. Trigger creates profiles record with:
   - `id` = user.id
   - `role` = from raw_user_meta_data or default 'student'
   - `display_name` = email
   - `letta_agent_id` = NULL (not yet created)

### Missing for Slice 12
- After profile creation, need to call Letta to create student agent
- Store returned `agent_id` in profiles.letta_agent_id
- This should happen in a backend endpoint (not in signup trigger)

---

## 5. FastAPI Main Structure

**File:** `/Users/tk/Desktop/Omniscience/agent/main.py`

### Current Pattern
```python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

# Build graphs with config injected via closure
observation_graph_changing_states = build_observation_graph(
    changing_states_config,
    changing_states_reactions,
)
chat_graph_changing_states = build_chat_graph(changing_states_config)

# ... repeat for electric_circuits, genetics_basics ...

# Register agents
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

### Registered Endpoints (6 agents)
- `/agents/observation-changing-states`
- `/agents/chat-changing-states`
- `/agents/observation-electric-circuits`
- `/agents/chat-electric-circuits`
- `/agents/observation-genetics-basics`
- `/agents/chat-genetics-basics`
- `/health` — Health check

### Auth Middleware
- `get_current_user` dependency available (optional auth)
- `/me` endpoint returns user + profile data

### Missing for Slice 12
- Letta client initialization
- Endpoint to create student agent on signup
- Endpoint to fetch student memory
- Endpoint to update memory after session
- Memory injection into graph builders

---

## 6. Python Dependencies

**File:** `/Users/tk/Desktop/Omniscience/agent/pyproject.toml`

### Current Dependencies
```toml
dependencies = [
    "copilotkit>=0.1.30",
    "langgraph>=0.2.0",
    "langchain-core>=0.3.0",
    "langchain-google-genai>=2.1.0",
    "supabase>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24.0",
]
```

### Missing for Slice 12
- `letta-client` — Python SDK for Letta
- Version: TBD (check latest from Letta docs)

---

## 7. Existing Memory/Agent Client Patterns

### Supabase Client Pattern
**File:** `/Users/tk/Desktop/Omniscience/agent/lib/supabase_client.py`

```python
def get_supabase_client() -> Client:
    """Create Supabase client using service role key."""
    url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, service_role_key)
```

### Auth Middleware Pattern
**File:** `/Users/tk/Desktop/Omniscience/agent/middleware/auth.py`

```python
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """FastAPI dependency for optional authentication."""
    if not credentials:
        return None
    return await get_user_from_token(credentials.credentials)
```

### Graph Builder Pattern (Closure Injection)
**File:** `/Users/tk/Desktop/Omniscience/agent/graphs/observation.py`

```python
def build_observation_graph(topic_config: TopicConfig, reaction_registry: ReactionRegistry):
    """TopicConfig and ReactionRegistry captured by closure — never in state."""
    
    async def event_classifier(state: ObservationAgentState) -> dict:
        # Access topic_config via closure
        pass
    
    # Build graph with nodes
    graph = StateGraph(ObservationAgentState)
    graph.add_node("event_classifier", event_classifier)
    # ...
    return graph.compile(checkpointer=MemorySaver())
```

### Key Pattern for Slice 12
- Follow same closure pattern: `build_observation_graph(topic_config, reaction_registry, student_memory=None)`
- Inject memory into system prompts
- Memory should NOT be in graph state (transient, fetched per session)

---

## 8. AuthContext (Frontend)

**File:** `/Users/tk/Desktop/Omniscience/contexts/AuthContext.tsx`

### Current Structure
```typescript
interface Profile {
  id: string;
  role: "student" | "teacher";
  display_name: string | null;
  avatar_url: string | null;
  letta_agent_id: string | null;  // Already prepared
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

### Initialization Flow
1. On mount: `supabase.auth.getUser()` → get current user
2. If user exists: fetch profile from `profiles` table
3. Listen to `onAuthStateChange` for session updates
4. Profile includes `letta_agent_id` (ready for use)

---

## 9. Architecture Documentation

**File:** `/Users/tk/Desktop/Omniscience/arch-v3.md` (1346 lines)

### Slice 12 Section (lines 877–1020)

#### Letta Integration Code (Planned)
```python
# agent/memory/letta_client.py

def get_letta_client() -> Letta:
    """Get Letta client — self-hosted server."""
    return Letta(base_url=os.getenv("LETTA_BASE_URL", "http://localhost:8283"))

def create_student_agent(student_id: str, name: str, age: int) -> str:
    """Create Letta agent for new student. Returns agent_id."""
    # Creates agent with 4 memory blocks:
    # - student_profile
    # - learning_style
    # - knowledge_state
    # - interests

def get_student_memory(agent_id: str) -> dict:
    """Read all memory blocks for injection into companion prompts."""

def update_student_memory_after_session(
    agent_id: str,
    session_summary: str,
    topic: str,
    duration_minutes: int,
) -> None:
    """Send session data to Letta agent for self-editing memory update."""
```

#### Memory Injection Pattern (Planned)
```python
# In graphs/observation.py

def build_observation_graph(topic_config, reaction_registry, student_memory=None):
    async def ai_reasoning(state, config):
        memory_context = ""
        if student_memory:
            memory_context = f"""
STUDENT MEMORY (from past sessions):
- Profile: {student_memory.get('student_profile')}
- Learning Style: {student_memory.get('learning_style')}
- Knowledge: {student_memory.get('knowledge_state')}
- Interests: {student_memory.get('interests')}
"""
        # Inject into system prompt
```

#### Docker Compose Addition (Planned)
```yaml
letta:
  image: letta:latest
  container_name: omniscience-letta
  ports:
    - "8283:8283"
  environment:
    - LETTA_DB_URL=postgresql://...
  depends_on:
    - supabase-db
  restart: unless-stopped
```

---

## 10. Key Integration Points for Slice 12

### 1. Letta Client Module
**Location:** `agent/memory/letta_client.py` (NEW)
- `get_letta_client()` — Initialize Letta client
- `create_student_agent(student_id, name, age)` — Create agent on signup
- `get_student_memory(agent_id)` — Fetch memory for session
- `update_student_memory_after_session(...)` — Update memory after session

### 2. Signup Endpoint
**Location:** `agent/main.py` (NEW endpoint)
- POST `/api/students/{user_id}/create-memory-agent`
- Called after profile creation
- Creates Letta agent, stores agent_id in profiles.letta_agent_id

### 3. Session Start
**Location:** `agent/graphs/observation.py` and `agent/graphs/chat.py` (MODIFY)
- Fetch student memory via `get_student_memory(agent_id)`
- Inject into graph builder as `student_memory` parameter
- Include in system prompts for AI reasoning

### 4. Session End
**Location:** `agent/main.py` (NEW endpoint)
- POST `/api/students/{user_id}/update-memory`
- Receives session summary, topic, duration
- Calls `update_student_memory_after_session(...)`

### 5. Docker Compose
**Location:** `docker-compose.yml` (MODIFY)
- Add Letta service (port 8283)
- Set `LETTA_BASE_URL=http://letta:8283` in backend environment

### 6. Environment Variables
**Location:** `.env.example` (MODIFY)
- Add `LETTA_BASE_URL=http://localhost:8283` (local dev)
- Add `LETTA_BASE_URL=http://letta:8283` (Docker)

### 7. Dependencies
**Location:** `agent/pyproject.toml` (MODIFY)
- Add `letta-client>=X.Y.Z`

---

## 11. Current State Summary

### What Exists
✅ Database schema with `letta_agent_id` column  
✅ Auth system (Supabase) with signup flow  
✅ FastAPI backend with agent registration pattern  
✅ Supabase client pattern (service role)  
✅ Auth middleware (JWT verification)  
✅ Graph builder pattern (closure injection)  
✅ Frontend AuthContext with profile loading  
✅ Architecture documentation with Letta design  

### What's Missing
❌ Letta service in docker-compose.yml  
❌ `agent/memory/letta_client.py` module  
❌ Endpoint to create student agent on signup  
❌ Endpoint to fetch student memory  
❌ Endpoint to update memory after session  
❌ Memory injection into observation/chat graphs  
❌ `letta-client` dependency in pyproject.toml  
❌ Environment variable configuration  

---

## 12. File Paths (Absolute)

### Core Files
- `/Users/tk/Desktop/Omniscience/docker-compose.yml`
- `/Users/tk/Desktop/Omniscience/agent/main.py`
- `/Users/tk/Desktop/Omniscience/agent/config.py`
- `/Users/tk/Desktop/Omniscience/agent/models.py`
- `/Users/tk/Desktop/Omniscience/agent/lib/supabase_client.py`
- `/Users/tk/Desktop/Omniscience/agent/middleware/auth.py`
- `/Users/tk/Desktop/Omniscience/agent/graphs/observation.py`
- `/Users/tk/Desktop/Omniscience/agent/graphs/chat.py`
- `/Users/tk/Desktop/Omniscience/agent/pyproject.toml`

### Database
- `/Users/tk/Desktop/Omniscience/supabase/migrations/20260307000000_auth_profiles.sql`

### Frontend
- `/Users/tk/Desktop/Omniscience/contexts/AuthContext.tsx`
- `/Users/tk/Desktop/Omniscience/app/(auth)/signup/page.tsx`

### Documentation
- `/Users/tk/Desktop/Omniscience/arch-v3.md` (lines 877–1020 for Slice 12)

---

## 13. Next Steps for Implementation

1. **Add Letta to docker-compose.yml**
   - New service: `letta` on port 8283
   - Depends on supabase-db

2. **Create `agent/memory/letta_client.py`**
   - Implement 4 functions from architecture doc
   - Handle Letta API calls

3. **Add endpoints to `agent/main.py`**
   - POST `/api/students/{user_id}/create-memory-agent`
   - POST `/api/students/{user_id}/update-memory`

4. **Modify graph builders**
   - Add `student_memory` parameter to `build_observation_graph` and `build_chat_graph`
   - Inject memory into system prompts

5. **Update dependencies**
   - Add `letta-client` to pyproject.toml

6. **Update environment variables**
   - Add `LETTA_BASE_URL` to .env.example

7. **Create signup hook**
   - Call memory agent creation after profile creation
   - Store agent_id in profiles table

