# Exploration Findings: Slice 8 (Auth + Profiles) Implementation

## Project Overview

**Omniscience** is a Next.js 14 + FastAPI educational platform for children (ages 6-12) with AI-powered companion learning. The codebase is currently at Slice 7 (full integration of core simulation + companion + chat agents). Slice 8 adds authentication and user profiles via Supabase.

---

## 1. Current Project Structure

### Frontend (Next.js 14 App Router)
```
app/
  ├── layout.tsx                    # Root layout with LocaleProvider, ErrorBoundary
  ├── page.tsx                      # Home page (topic carousel + companion hub)
  ├── globals.css                   # Tailwind + base styles
  ├── error.tsx, not-found.tsx      # Error boundaries
  ├── api/
  │   ├── copilotkit/route.ts       # CopilotKit runtime endpoint (agents)
  │   └── voice/route.ts            # Voice API
  └── topics/
      ├── changing-states/page.tsx
      ├── electric-circuits/page.tsx
      └── genetics-basics/page.tsx

components/
  ├── ui/                           # GrainOverlay, shared UI
  ├── home/                         # CompanionHub, TopicCarousel, TopicCard
  ├── companion/                    # Companion, SpeechBubble, SuggestionBubbles
  ├── chat/                         # ChatOverlay
  ├── simulations/                  # ChangingStatesSimulation, etc.
  ├── notebook/                     # Notebook UI
  └── spotlight/                    # SpotlightCard

contexts/
  └── LocaleContext.tsx             # i18n context (en/zh)

lib/
  ├── i18n.ts                       # Translation strings
  ├── session.ts                    # Session ID generation (UUID per topic)
  ├── gemini-voice.ts               # Voice API integration
  ├── sounds.ts                     # Sound utilities
  ├── topics/index.ts               # Topic metadata
  └── types/
      ├── index.ts                  # Shared types (SimulationEvent, ReactionPayload, etc.)
      ├── changing-states.ts
      ├── electric-circuits.ts
      └── genetics-basics.ts

framework/
  └── TopicRunner.tsx               # Universal wrapper (simulation + companion + chat)
```

### Backend (FastAPI + LangGraph)
```
agent/
  ├── main.py                       # FastAPI app entry point
  ├── middleware.py                 # FixAGUIProtocolMiddleware (CopilotKit protocol fixes)
  ├── config.py                     # Environment loading
  ├── models.py                     # Shared Python types (SimulationEvent, ReactionPayload, etc.)
  ├── pyproject.toml                # Dependencies (copilotkit, langgraph, langchain-google-genai)
  ├── langgraph.json                # LangGraph CLI config
  ├── graphs/
  │   ├── observation.py            # Observation agent (event → reaction lookup → AI reasoning)
  │   └── chat.py                   # Chat agent (conversational responses)
  ├── topics/
  │   ├── changing_states/
  │   │   ├── config.py             # TopicConfig (prompts, knowledge context)
  │   │   └── reactions.py          # ReactionRegistry (programmed reactions)
  │   ├── electric_circuits/
  │   └── genetics_basics/
  ├── tools/
  │   └── emit_reaction.py          # Tool for AI to emit reactions
  └── tests/
      ├── test_agents.py
      ├── test_reaction_lookup.py
      └── fixtures/sample_events.py
```

---

## 2. Existing Dependencies

### Frontend (package.json)
- **Next.js 14.2.29** — App Router, SSR
- **React 18.3.1** — UI framework
- **@copilotkit/react-core, @copilotkit/react-ui, @copilotkit/runtime** — Agent integration
- **Framer Motion 11.18.0** — Animations
- **Tailwind CSS 3.4.17** — Styling
- **TypeScript 5.7.0** — Type safety
- **Google Genai 1.44.0** — Voice API

**No auth library installed yet** — Supabase will be added in Slice 8.

### Backend (pyproject.toml)
- **copilotkit >= 0.1.30** — Agent framework
- **langgraph >= 0.2.0** — Graph orchestration
- **langchain-core >= 0.3.0** — LLM abstractions
- **langchain-google-genai >= 2.1.0** — Gemini integration (NOT OpenAI)
- **pytest, pytest-asyncio** — Testing

**No database driver installed yet** — Supabase Python client will be added.

---

## 3. Environment Variables

### Current (.env)
```
GOOGLE_API_KEY=AIzaSyBS9ztNlcY6_MPik5ayamL_g3DNwEbIHcw
# LANGSMITH_API_KEY=
# LANGGRAPH_DEPLOYMENT_URL=http://localhost:8123
```

### Expected for Slice 8 (from arch-v3.md)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Server-side only

# Existing
GOOGLE_API_KEY=...
BACKEND_URL=http://localhost:8123  # Frontend → Backend
```

---

## 4. Routing Structure (Current)

### Public Routes
- `/` — Home (topic carousel)
- `/topics/[id]` — Topic page (simulation + companion)

### No Auth Routes Yet
- No login/signup pages
- No role-based routing
- No protected routes

### Expected for Slice 8 (from arch-v3.md)
```
app/
  (auth)/                    # Public routes
    login/page.tsx
    signup/page.tsx
  (student)/                 # Protected, role === 'student'
    layout.tsx               # Student shell
    page.tsx                 # Current home page
    topics/[id]/page.tsx     # Current topic pages
  (teacher)/                 # Protected, role === 'teacher'
    layout.tsx               # Teacher shell (sidebar nav)
    dashboard/page.tsx       # My Courses
    courses/new/page.tsx     # Course builder
  api/
    auth/callback/route.ts   # Supabase callback
    copilotkit/route.ts      # Existing (unchanged)
```

---

## 5. Database Schema (Planned for Slice 8)

From arch-v3.md, the schema extends Supabase's built-in `auth.users`:

```sql
-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher')) not null default 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,          -- For Slice 12 (memory)
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Courses (teacher-created, for Slice 9+)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  format text check (format in ('lab', 'quiz')) not null default 'lab',
  age_range int4range,
  status text check (status in ('draft', 'published')) default 'draft',
  simulation_jsx text,              -- JSX source
  interactions_json jsonb,          -- Event→Reaction mappings
  companion_config jsonb,           -- Companion personality
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;
create policy "Teachers can CRUD own courses" on public.courses
  for all using (auth.uid() = teacher_id);
create policy "Students can read published courses" on public.courses
  for select using (status = 'published');

-- Student Progress (for Slice 9+)
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) not null,
  course_id uuid references public.courses(id) not null,
  thread_id uuid,                    -- CopilotKit session
  progress_data jsonb default '{}',
  reaction_history text[] default '{}',
  last_active timestamptz default now(),
  unique(student_id, course_id)
);

alter table public.student_progress enable row level security;
create policy "Students own their progress" on public.student_progress
  for all using (auth.uid() = student_id);
```

---

## 6. Existing Auth Patterns

### Session Management (Current)
- **lib/session.ts** — Client-side session ID generation
  - Uses `sessionStorage` to cache UUID per topic
  - Enables CopilotKit to restore agent state across page reloads
  - No user authentication, just session persistence

### No User Context Yet
- No `AuthContext` or `useAuth()` hook
- No middleware for route protection
- No server-side session validation

---

## 7. Backend API Structure

### Current Endpoints
- `POST /agents/observation-[topic]` — Observation agent (event → reaction)
- `POST /agents/chat-[topic]` — Chat agent (conversational)
- `GET /health` — Health check

### Middleware
- **CORSMiddleware** — Allow all origins (needs tightening in production)
- **FixAGUIProtocolMiddleware** — Fixes CopilotKit protocol bugs (adds threadId, runId, state, tools, context, forwardedProps, message IDs)

### No Auth Middleware Yet
- No JWT validation
- No role-based access control
- No user context injection

---

## 8. TypeScript Path Aliases

From `tsconfig.json`:
```json
"paths": {
  "@/*": ["./*"]
}
```

All imports use `@/` prefix (e.g., `@/components/ui/GrainOverlay`).

---

## 9. Build & Deployment

### Docker Setup
- **Dockerfile.backend** — FastAPI + LangGraph
- **Dockerfile.frontend** — Next.js
- **docker-compose.yml** — Orchestrates both services
  - Backend: port 8124 (maps to 8123 internal)
  - Frontend: port 3082 (maps to 3000 internal)
  - Health check on backend `/health`

### Next.js Config
- `output: 'standalone'` — Optimized for Docker
- Webpack config suppresses warnings from `@whatwg-node/fetch`

---

## 10. Key Gotchas & Constraints

### 1. **CopilotKit Protocol Fixes**
   - Middleware in `agent/middleware.py` patches missing fields (threadId, runId, state, tools, context, forwardedProps, message IDs)
   - Any auth changes must preserve this middleware

### 2. **Gemini (Not OpenAI)**
   - Backend uses `langchain-google-genai` exclusively
   - Observation agent: `gemini-2.5-flash`
   - Chat agent: `gemini-2.5-flash-lite-preview-06-17`
   - Course builder (Slice 11): `gemini-3.1-pro-preview`
   - **Important:** Gemini 3+ defaults `temperature=1.0` if not set

### 3. **Session Persistence**
   - CopilotKit uses `threadId` to restore agent state
   - Current implementation caches UUID in `sessionStorage` per topic
   - Slice 8 should integrate with Supabase `student_progress.thread_id` for cross-device persistence

### 4. **i18n Context**
   - `LocaleContext` provides `locale` (en/zh) and `t` (translations)
   - Auth context should be added alongside, not replacing this

### 5. **No Database Yet**
   - All data is ephemeral (in-memory agent state)
   - Supabase will be first persistent store

### 6. **CORS Currently Open**
   - `allow_origins=["*"]` in FastAPI
   - Slice 8 should tighten this to frontend URL

### 7. **Environment Variable Patterns**
   - Frontend: `NEXT_PUBLIC_*` for client-side access
   - Backend: `.env` loaded via `config.py` before imports
   - Supabase keys: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 8. **Middleware Placement**
   - Next.js middleware runs at edge (before route handlers)
   - Must use `createServerClient` with cookie management
   - Cannot use browser APIs

---

## 11. Slice 8 Acceptance Criteria (from arch-v3.md)

- Can sign up as student → sees current homepage
- Can sign up as teacher → redirected to empty dashboard
- Unauthenticated → redirected to login
- Student cannot access teacher routes

---

## 12. Files to Create/Modify for Slice 8

### New Files
- `lib/supabase/client.ts` — Browser client
- `lib/supabase/server.ts` — Server client
- `middleware.ts` — Auth middleware (root level)
- `app/(auth)/login/page.tsx` — Login page
- `app/(auth)/signup/page.tsx` — Signup page
- `app/api/auth/callback/route.ts` — Supabase callback
- `contexts/AuthContext.tsx` — Auth provider + hook
- Database migration SQL (Supabase dashboard or migration file)

### Modified Files
- `app/layout.tsx` — Wrap with AuthProvider
- `package.json` — Add `@supabase/ssr`, `@supabase/supabase-js`
- `.env.example` — Add Supabase keys
- `next.config.js` — May need adjustments for middleware

### Restructured Routes
- Move current `app/page.tsx` → `app/(student)/page.tsx`
- Move current `app/topics/` → `app/(student)/topics/`
- Create `app/(student)/layout.tsx` (student shell)
- Create `app/(teacher)/layout.tsx` (teacher shell, for Slice 9)

---

## 13. Integration Points with Existing Code

### CopilotKit Integration
- Observation agent receives `threadId` from frontend
- Slice 8 should store `threadId` in `student_progress.thread_id` for persistence
- No changes needed to agent code for basic auth

### Companion & TopicRunner
- `TopicRunner.tsx` currently uses local session ID
- Slice 8 should pass authenticated user ID to TopicRunner
- Companion reactions remain unchanged

### API Routes
- `/api/copilotkit` remains unchanged
- New `/api/auth/callback` handles Supabase redirects
- Future: `/api/course-builder` (Slice 11)

---

## 14. Recommended Implementation Order

1. **Supabase Project Setup** — Create project at supabase.com, get keys
2. **Install Dependencies** — `npm install @supabase/ssr @supabase/supabase-js`
3. **Supabase Clients** — `lib/supabase/client.ts`, `lib/supabase/server.ts`
4. **Database Migration** — Create `profiles` table via Supabase dashboard
5. **Auth Context** — `contexts/AuthContext.tsx` with `useAuth()` hook
6. **Middleware** — `middleware.ts` for route protection + role-based routing
7. **Auth Pages** — `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
8. **Auth Callback** — `app/api/auth/callback/route.ts`
9. **Route Restructuring** — Move existing routes into `(student)` group
10. **Wrap Root Layout** — Add `AuthProvider` to `app/layout.tsx`
11. **Test** — Sign up as student/teacher, verify redirects

---

## Summary

Omniscience is a well-structured Next.js + FastAPI platform with clear separation of concerns. Slice 8 adds Supabase authentication and user profiles, requiring:
- Supabase project setup + database schema
- Auth context + middleware for route protection
- Login/signup pages with role selection
- Restructuring existing routes into `(student)` and `(teacher)` groups
- No changes to agent code or existing simulation/companion logic

The codebase is ready for auth integration — no architectural conflicts or blockers identified.
