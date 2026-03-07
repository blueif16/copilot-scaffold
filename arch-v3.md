# Omniscience — Architecture v3

## Auth + Teacher Course Builder + Student Memory

---

## 1. What Changed from v2

v2 is a single-user educational simulation platform. v3 adds three systems:

1. **Auth + Roles** — Supabase Auth (cloud-hosted) wrapping the current interface. Students see what exists today. Teachers get a new dashboard.
2. **Teacher Course Builder** — A chat-first coding agent (Gemini 3.1 Pro) that writes/edits a single JSX template. Teacher starts in a full-page chatbot (ChatGPT-style), picks a template, then iterates in a fullscreen chat. Live preview only appears when the agent starts editing code. Interactions are captured as JSON. No backend agents needed for the prototype.
3. **Student Memory** — Letta (formerly MemGPT) provides persistent, self-editing memory per student. The companion remembers learning pace, interests, misconceptions, and preferred study methods across sessions.

---

## 2. Formats / Templates

There are exactly **two interaction formats**. Every course a teacher builds is one of these:

### Format 1: Lab Simulation

The current `ChangingStatesSimulation` pattern — a single JSX component with:
- An interactive canvas (particles, drag-and-drop, sliders, etc.)
- State variables the student controls
- Event emissions (`onEvent`) that drive companion reactions
- Visual feedback (color changes, animations, phase transitions)

All three existing topics (ChangingStates, ElectricCircuits, GeneticsBasics) are Lab format. The AI agent edits a **single JSX file** that follows this contract:

```typescript
// Template contract — every Lab simulation implements this
interface LabSimulationProps {
  onEvent: (event: { type: string; data: Record<string, any> }) => void;
}

export default function Simulation({ onEvent }: LabSimulationProps) {
  // All state is local
  // All rendering is self-contained
  // onEvent fires when meaningful interactions happen
  // Returns full interactive UI
}
```

### Format 2: Quiz Adventure

A branching question-answer flow:
- Sequential or branching questions
- Multiple choice, drag-to-sort, matching, fill-in-the-blank
- Immediate visual feedback (correct/wrong animations)
- Progress tracking
- `onEvent` fires: `answer_correct`, `answer_wrong`, `quiz_complete`, `streak`, etc.

Same contract — single JSX file, `onEvent` prop.

---

## 3. Auth System

### Stack: Supabase Auth (Cloud) + Supabase PostgreSQL

**Why Supabase over Clerk:** Own your data. Free tier is 50k MAU. Auth + DB + Realtime in one service. No per-user pricing cliff. Can self-host later for China deployment on HK VPS, but **use Supabase Cloud for now** — zero infrastructure overhead during prototyping.

### Route Structure

```
app/
  (auth)/                    ← Public routes (no auth required)
    login/page.tsx
    signup/page.tsx
  (student)/                 ← Requires auth, role === 'student'
    layout.tsx               ← Student shell (current app wrapper)
    page.tsx                 ← Current HomePage (topic carousel + companion hub)
    topics/[id]/page.tsx     ← Current topic pages (unchanged)
    courses/[id]/page.tsx    ← Teacher-published courses (Sandpack-rendered) [FUTURE]
  (teacher)/                 ← Requires auth, role === 'teacher'
    layout.tsx               ← Teacher shell (different nav, muted theme)
    dashboard/page.tsx       ← Course list, analytics placeholder
    courses/new/page.tsx     ← Course builder (chat + Sandpack)
    courses/[id]/edit/page.tsx
  api/
    auth/callback/route.ts   ← Supabase auth callback
    copilotkit/route.ts      ← Existing agent routes (unchanged)
```

### Database Schema

```sql
-- Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher')) not null default 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,          -- Letta agent ID for this student's memory
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Teacher-created courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  format text check (format in ('lab', 'quiz')) not null default 'lab',
  age_range int4range,
  status text check (status in ('draft', 'published')) default 'draft',
  -- The generated content
  simulation_jsx text,              -- Single JSX source for Sandpack
  interactions_json jsonb,          -- Event→Reaction mappings
  companion_config jsonb,           -- Companion personality, knowledge context
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;
create policy "Teachers can CRUD own courses" on public.courses
  for all using (auth.uid() = teacher_id);
create policy "Students can read published courses" on public.courses
  for select using (status = 'published');

-- Student progress (per course)
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) not null,
  course_id uuid references public.courses(id) not null,
  thread_id uuid,                    -- CopilotKit session (for built-in topics)
  progress_data jsonb default '{}',
  reaction_history text[] default '{}',
  last_active timestamptz default now(),
  unique(student_id, course_id)
);

alter table public.student_progress enable row level security;
create policy "Students own their progress" on public.student_progress
  for all using (auth.uid() = student_id);
```

### Supabase Client Setup

```typescript
// lib/supabase/client.ts — Browser client
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts — Server component client
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// middleware.ts — Auth middleware
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  // Redirect unauthenticated users
  const isAuthRoute = request.nextUrl.pathname.startsWith("/(auth)") ||
    request.nextUrl.pathname === "/login" || 
    request.nextUrl.pathname === "/signup";
    
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // Role-based routing
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isTeacherRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/courses/new");
    
    if (isTeacherRoute && profile?.role !== "teacher") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|api/auth).*)",
  ],
};
```

### Teacher Dashboard Design Language

Same DNA as student UI, different register:

| Aspect | Student | Teacher |
|--------|---------|---------|
| Borders | `border-4 border-ink` | `border border-ink/20` |
| Shadows | `shadow-chunky` | `shadow-sm` |
| Colors | Full `playful-*` palette | Muted — `playful-*` as accents only |
| Typography | Fraunces display heavy | Fraunces display medium |
| Layout | Full-bleed, playful | Sidebar nav, data-dense |
| Rounded | `rounded-2xl` to `rounded-[3rem]` | `rounded-lg` |
| Personality | Highlights magazine | The Economist |

---

## 4. Teacher Course Builder

### The Flow (Revised)

The builder follows a **chat-first, preview-on-demand** interaction model. Teachers should feel like they're talking to an AI assistant, not wrestling with an IDE.

```
Phase 1 — Landing (/courses/new)
  → Full-page centered chat interface (ChatGPT-style)
  → Below the input: 2-3 template cards ("Water Cycle Lab", "Quiz Adventure", "Blank Lab")
  → Teacher can type freely OR click a template card to seed the conversation
  → No split pane yet. No code visible. Just a conversation.

Phase 2 — Chat (fullscreen)
  → Once conversation starts, transition to fullscreen chat
  → Teacher describes what they want: "Create a water cycle lesson for 7-year-olds"
  → AI responds conversationally, asks clarifying questions if needed
  → Chat takes 100% of viewport width — clean, focused

Phase 3 — Live Preview (appears on first code edit)
  → When the agent makes its first write_file/update_file tool call,
    the viewport splits: chat (left) + Sandpack preview (right)
  → Preview slides in with animation — teacher sees the result immediately
  → From here on, the split pane persists
  → Teacher: "Make the clouds puffier" → AI edits → preview updates
  → Teacher: "Add an interaction when rain starts falling"
    → AI updates interactions.json → companion behavior visible in preview

Phase 4 — Save
  → Teacher hits "Save Draft" (always available once code exists)
  → Title + description auto-generated from conversation, editable
  → Stored to Supabase `courses` table
```

**Why chat-first:** Teachers are not developers. Dropping them into a split-pane IDE is intimidating. Starting with a familiar chatbot interface reduces cognitive load. The preview appears _only when there's something to preview_, which is a natural reveal.

### The Coding Agent

**Model:** `gemini-3.1-pro-preview` via `langchain-google-genai`

**Why Gemini 3.1 Pro (not Flash):** This is the teacher-facing creative agent — it needs to generate high-quality, visually appealing interactive JSX from conversational descriptions. 3.1 Pro has significantly better reasoning and code generation than Flash. The extra latency is acceptable here because teachers are iterating, not doing real-time interaction. The model's improved agentic tool calling also means fewer broken `update_file` operations.

**Important:** Gemini 3+ models default `temperature` to 1.0 if not explicitly set. For creative code generation this is actually desirable. The `thinking_level` parameter (low/medium/high) replaces `thinking_budget` from 2.5 models.

**Framework:** LangGraph `create_react_agent` with custom tools

**Why LangGraph for this agent too:** Consistency with existing backend. Same deployment pattern. Tool calling works identically to the observation/chat agents.

```python
# agent/graphs/course_builder.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

# ── Tools ────────────────────────────────────────────────

@tool
def write_file(filename: str, content: str) -> str:
    """Write or overwrite a file in the sandbox environment.
    Use this to create or fully replace the simulation JSX or interactions JSON.
    
    Args:
        filename: The file to write. Must be one of:
            - "Simulation.jsx" — The main interactive component
            - "interactions.json" — Event→Reaction mappings
        content: The full file content to write.
    """
    # The actual file write happens on the frontend via WebSocket/SSE.
    # This tool returns the content so the frontend can update Sandpack.
    return f"OK: wrote {filename} ({len(content)} chars)"


@tool 
def update_file(filename: str, old_text: str, new_text: str) -> str:
    """Replace a specific section of text in a file.
    Use this for targeted edits instead of rewriting the entire file.
    
    Args:
        filename: The file to edit ("Simulation.jsx" or "interactions.json")
        old_text: The exact text to find and replace (must be unique in file)
        new_text: The replacement text
    """
    return f"OK: updated {filename}, replaced {len(old_text)} chars with {len(new_text)} chars"


# ── System Prompt ────────────────────────────────────────

COURSE_BUILDER_SYSTEM = """You are an expert educational interaction designer and React developer.
You help teachers create interactive science lessons for children.

You have two tools:
- write_file: Create or fully replace a file
- update_file: Make targeted edits to an existing file

You work with two files:
1. Simulation.jsx — A single-file React component that IS the interactive lesson.
   It receives one prop: `onEvent` — a callback you call when meaningful interactions happen.
   It must be fully self-contained (inline styles or Tailwind, no external imports except React and framer-motion).
   
2. interactions.json — Defines what the AI companion says/does in response to events.
   Format:
   {
     "topic": "water-cycle",
     "companion": { "name": "Nimbus", "personality": "friendly cloud" },
     "events": [
       {
         "id": "unique_id",
         "trigger": { "type": "event_type", "conditions": {} },
         "reaction": {
           "message": "What the companion says",
           "emotion": "excited|curious|impressed|celebrating|encouraging",
           "oneShot": true,
           "autoExpireMs": 4000
         }
       }
     ]
   }

RULES:
- The JSX must work in Sandpack with React + framer-motion + Tailwind CDN
- Use only inline styles or Tailwind classes — no CSS imports
- All state is local (useState, useRef)
- Touch-friendly: all interactive elements 48px+ hit targets
- Call onEvent({ type, data }) for meaningful moments:
  phase_change, milestone, dwell_timeout, first_interaction, etc.
- Keep the code clean, well-commented, age-appropriate visuals
- When the teacher asks for changes, prefer update_file for small edits
- Use write_file only for initial creation or major rewrites
- Always respond conversationally AND make tool calls — explain what you're doing

IMPORTANT: At the start of a conversation, do NOT immediately generate code.
First, understand what the teacher wants. Ask 1-2 clarifying questions if the
request is vague (age range, specific concepts to cover, interaction style).
Only generate code once you have enough context to make something good.
"""


# ── Build the Agent ──────────────────────────────────────

def build_course_builder_agent():
    """Build the course builder ReAct agent."""
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-pro-preview",
        temperature=1.0,          # Gemini 3+ default; good for creative code gen
        thinking_level="medium",  # Balance quality vs latency for iterative edits
        max_retries=2,
    )
    
    tools = [write_file, update_file]
    
    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=COURSE_BUILDER_SYSTEM,
    )
    
    return agent
```

### Frontend: Chat-First → Preview-On-Demand

The component manages three UI phases: landing (template selection), fullscreen chat, and split-pane (chat + preview). The preview only renders after the first tool call that generates code.

```typescript
// components/teacher/CourseBuilder.tsx

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Sandpack wrapper (App.jsx) ──────────────────────────

const APP_WRAPPER = `import Simulation from "./Simulation";
import interactions from "./interactions.json";
import { useState, useRef } from "react";

function CompanionBubble({ reaction }) {
  if (!reaction?.message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      background: "#fff", border: "2px solid #333",
      borderRadius: 16, padding: "12px 16px",
      maxWidth: 280, boxShadow: "3px 3px 0 #333",
      fontFamily: "sans-serif", fontSize: 14,
    }}>
      {reaction.message}
    </div>
  );
}

export default function App() {
  const [reaction, setReaction] = useState(null);
  const firedRef = useRef(new Set());
  const timerRef = useRef(null);
  
  const handleEvent = (event) => {
    const match = interactions.events.find(e => {
      if (firedRef.current.has(e.id) && e.reaction.oneShot) return false;
      return e.trigger.type === event.type;
    });
    if (match) {
      firedRef.current.add(match.id);
      setReaction(match.reaction);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => setReaction(null),
        match.reaction.autoExpireMs || 4000
      );
    }
  };
  
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Simulation onEvent={handleEvent} />
      <CompanionBubble reaction={reaction} />
    </div>
  );
}`;


// ── Template Cards ──────────────────────────────────────

const TEMPLATES = [
  {
    id: "lab-blank",
    title: "Blank Lab",
    description: "Start from scratch with an interactive simulation",
    format: "lab" as const,
    seedPrompt: null, // No seed — teacher types freely
  },
  {
    id: "lab-water-cycle",
    title: "Water Cycle Lab",
    description: "Evaporation, condensation, precipitation — interactive",
    format: "lab" as const,
    seedPrompt: "Create an interactive water cycle simulation for elementary school students. Include clouds, rain, evaporation from a lake, and condensation. Make it colorful and touch-friendly.",
  },
  {
    id: "quiz-science",
    title: "Science Quiz",
    description: "Branching question-answer adventure",
    format: "quiz" as const,
    seedPrompt: "Create a fun science quiz adventure for 8-10 year olds. Include multiple choice questions with immediate visual feedback and a progress tracker.",
  },
];


// ── Types ───────────────────────────────────────────────

type Phase = "landing" | "chat" | "split";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SandpackFiles {
  [key: string]: string;
}


// ── Course Builder Component ────────────────────────────

export function CourseBuilder() {
  // UI phase
  const [phase, setPhase] = useState<Phase>("landing");
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Sandpack files — null until first code generation
  const [files, setFiles] = useState<SandpackFiles | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  
  // Format tracking
  const [format, setFormat] = useState<"lab" | "quiz">("lab");

  // Transition to split pane when files first appear
  useEffect(() => {
    if (files && phase === "chat") {
      setPhase("split");
    }
  }, [files, phase]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { role: "user", content };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Transition from landing to fullscreen chat on first message
    if (phase === "landing") setPhase("chat");

    try {
      const res = await fetch("/api/course-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          currentFiles: filesRef.current,
          format,
        }),
      });
      
      const data = await res.json();
      
      // Process tool calls — this is what triggers the preview to appear
      if (data.toolCalls?.length) {
        const newFiles: SandpackFiles = {
          ...(filesRef.current || {}),
          "/App.jsx": APP_WRAPPER,
        };
        
        for (const call of data.toolCalls) {
          if (call.name === "write_file") {
            const { filename, content } = call.args;
            newFiles[`/${filename}`] = content;
          } else if (call.name === "update_file") {
            const { filename, old_text, new_text } = call.args;
            const key = `/${filename}`;
            const current = newFiles[key] || filesRef.current?.[key] || "";
            newFiles[key] = current.replace(old_text, new_text);
          }
        }
        
        setFiles(newFiles);
      }
      
      if (data.message) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (err) {
      console.error("Course builder error:", err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Something went wrong. Try again?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, phase, format]);

  const handleTemplateClick = (template: typeof TEMPLATES[0]) => {
    setFormat(template.format);
    if (template.seedPrompt) {
      sendMessage(template.seedPrompt);
    } else {
      setPhase("chat");
    }
  };

  // ── Chat Panel (shared across phases) ─────────────────
  
  const chatPanel = (
    <div className={`flex flex-col ${phase === "split" ? "w-1/2" : "w-full max-w-3xl mx-auto"}`}>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && phase === "chat" && (
          <div className="text-center text-ink/40 mt-20">
            <p className="text-lg font-serif">What would you like to teach?</p>
            <p className="text-sm mt-2">Describe your lesson and I'll build it for you.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-playful-sky/20 ml-12"
                : "bg-paper mr-12 border border-ink/10"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-ink/40 text-sm animate-pulse ml-4">Building...</div>
        )}
      </div>
      
      {/* Input */}
      <div className="border-t border-ink/10 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Describe your lesson or ask for changes..."
            className="flex-1 px-4 py-3 rounded-xl border border-ink/20 text-sm focus:outline-none focus:border-ink/40"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-ink text-paper rounded-xl text-sm font-medium disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  // ── Landing Phase ─────────────────────────────────────
  
  if (phase === "landing") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-serif text-center mb-2">Create a Lesson</h1>
          <p className="text-center text-ink/50 mb-8">
            Describe what you want to teach, or start from a template.
          </p>
          
          {/* Chat input (centered, like ChatGPT) */}
          <div className="flex gap-2 mb-10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="e.g. Create a lesson about photosynthesis for 10-year-olds..."
              className="flex-1 px-4 py-3 rounded-xl border border-ink/20 text-sm focus:outline-none focus:border-ink/40"
              autoFocus
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="px-5 py-3 bg-ink text-paper rounded-xl text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
          
          {/* Template cards */}
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTemplateClick(t)}
                className="text-left p-4 rounded-lg border border-ink/15 hover:border-ink/30 hover:shadow-sm transition-all"
              >
                <div className="text-xs uppercase tracking-wide text-ink/40 mb-1">
                  {t.format}
                </div>
                <div className="font-medium text-sm mb-1">{t.title}</div>
                <div className="text-xs text-ink/50">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Chat Phase (fullscreen) ───────────────────────────
  
  if (phase === "chat") {
    return <div className="h-full flex flex-col">{chatPanel}</div>;
  }

  // ── Split Phase (chat + preview) ──────────────────────
  
  return (
    <div className="flex h-full">
      {/* Left: Chat */}
      <div className="w-1/2 flex flex-col border-r border-ink/10">
        {chatPanel}
      </div>
      
      {/* Right: Live Preview (slides in) */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-1/2"
        >
          {files && (
            <SandpackProvider
              template="react"
              files={files}
              customSetup={{
                dependencies: { "framer-motion": "^11.0.0" },
              }}
              options={{
                externalResources: ["https://cdn.tailwindcss.com"],
                autoReload: true,
              }}
            >
              <SandpackPreview
                style={{ height: "100%" }}
                showNavigator={false}
                showRefreshButton={true}
                showOpenInCodeSandbox={false}
              />
            </SandpackProvider>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### API Route: Course Builder Agent

```typescript
// app/api/course-builder/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, currentFiles, format } = await req.json();

  // Forward to the FastAPI backend course-builder agent
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8123";
  
  const res = await fetch(`${backendUrl}/agents/course-builder/invoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      // Pass current files so update_file knows what to search
      context: { currentFiles, format },
    }),
  });

  const data = await res.json();

  // Extract tool calls and final message from agent response
  const toolCalls: any[] = [];
  let assistantMessage = "";

  for (const msg of data.messages || []) {
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        toolCalls.push({ name: tc.name, args: tc.args });
      }
    }
    if (msg.type === "ai" && msg.content) {
      assistantMessage = msg.content;
    }
  }

  return NextResponse.json({
    message: assistantMessage,
    toolCalls,
  });
}
```

### Backend: Registering the Course Builder Agent

```python
# In agent/main.py — add to existing FastAPI app

from graphs.course_builder import build_course_builder_agent

course_builder_agent = build_course_builder_agent()

# Register with FastAPI (same pattern as observation/chat agents)
# The agent uses create_react_agent so it's a compiled StateGraph
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="course-builder",
        description="AI coding agent that creates interactive educational simulations",
        graph=course_builder_agent,
    ),
    path="/agents/course-builder",
)
```

### Saving Drafts to Supabase

When teacher hits "Save Draft":

```typescript
const saveDraft = async (courseData: {
  title: string;
  description: string;
  format: "lab" | "quiz";
  simulationJsx: string;
  interactionsJson: object;
}) => {
  const supabase = createSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase.from("courses").upsert({
    teacher_id: user!.id,
    title: courseData.title,
    description: courseData.description,
    format: courseData.format,
    status: "draft",
    simulation_jsx: courseData.simulationJsx,
    interactions_json: courseData.interactionsJson,
    updated_at: new Date().toISOString(),
  });
  
  return data;
};
```

---

## 5. Student Memory System (Letta)

### Why Letta

Letta provides self-editing memory — the agent decides what to remember about each student. This is fundamentally different from a static database column. The companion doesn't just store "student likes visual learning." It learns through interaction: "When I showed Sarah a diagram she engaged 3x more than when I gave text explanations. She also tends to rush through solid→liquid but spends time exploring gas phase. She understands melting but has a misconception that steam disappears rather than dispersing."

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Letta Server (Docker, port 8283)                    │
│  Self-hosted, PostgreSQL-backed                      │
│                                                      │
│  Per-student agent with memory blocks:               │
│  ┌──────────────────────────────────────────┐       │
│  │ "student_profile"                         │       │
│  │ Name, age, grade, school.                 │       │
│  │ Preferred name: "Saz" (not Sarah).        │       │
│  └──────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────┐       │
│  │ "learning_style"                          │       │
│  │ Strong visual learner. Responds well to   │       │
│  │ questions over explanations. Prefers       │       │
│  │ exploring before being told answers.       │       │
│  │ Tends to rush, benefits from "slow down"  │       │
│  │ prompts. Loves real-world connections.     │       │
│  └──────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────┐       │
│  │ "knowledge_state"                         │       │
│  │ Mastered: phase changes, particle model.  │       │
│  │ In progress: energy transfer.             │       │
│  │ Misconception: thinks gas "disappears."   │       │
│  │ Sessions completed: 4. Avg duration: 12m. │       │
│  └──────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────┐       │
│  │ "interests"                               │       │
│  │ Loves dinosaurs, space, cooking.          │       │
│  │ Connect science to food when possible.    │       │
│  │ Favorite topic so far: gas phase.         │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  Archival memory: full session transcripts,          │
│  searchable via embedding                            │
└──────────────────────────┬──────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI Backend (existing agent server)              │
│                                                      │
│  On session start:                                   │
│    → Read student's Letta memory blocks              │
│    → Inject into observation + chat agent prompts    │
│                                                      │
│  On session end:                                     │
│    → Send session summary to Letta agent             │
│    → Letta agent self-edits memory blocks            │
│    → Archive session transcript                      │
└─────────────────────────────────────────────────────┘
```

### Letta Integration Code

```python
# agent/memory/letta_client.py

from letta_client import Letta
import os

def get_letta_client() -> Letta:
    """Get Letta client — self-hosted server."""
    return Letta(base_url=os.getenv("LETTA_BASE_URL", "http://localhost:8283"))


def create_student_agent(student_id: str, name: str, age: int) -> str:
    """Create a Letta agent for a new student. Returns agent_id."""
    client = get_letta_client()
    
    agent = client.agents.create(
        name=f"student-{student_id}",
        model="google/gemini-2.5-flash",  # Cheaper model for memory management
        embedding="openai/text-embedding-3-small",
        memory_blocks=[
            {
                "label": "student_profile",
                "value": f"Name: {name}. Age: {age}. New student, no history yet.",
            },
            {
                "label": "learning_style",
                "value": "No data yet. Observe how the student interacts to determine their learning preferences.",
            },
            {
                "label": "knowledge_state",
                "value": "No topics completed yet. No known misconceptions.",
            },
            {
                "label": "interests",
                "value": "No known interests yet. Pay attention to what excites the student.",
            },
        ],
        enable_sleeptime=True,  # Background memory processing
        description=f"Memory agent for student {name}",
    )
    
    return agent.id


def get_student_memory(agent_id: str) -> dict:
    """Read all memory blocks for injection into companion prompts."""
    client = get_letta_client()
    memory = {}
    for label in ["student_profile", "learning_style", "knowledge_state", "interests"]:
        block = client.agents.blocks.retrieve(agent_id=agent_id, block_label=label)
        memory[label] = block.value
    return memory


def update_student_memory_after_session(
    agent_id: str,
    session_summary: str,
    topic: str,
    duration_minutes: int,
) -> None:
    """Send session data to Letta agent for self-editing memory update."""
    client = get_letta_client()
    
    # The Letta agent processes this message and autonomously
    # decides what to update in its memory blocks
    client.agents.messages.create(
        agent_id=agent_id,
        messages=[
            {
                "role": "user",
                "content": (
                    f"SESSION COMPLETE — Topic: {topic}, Duration: {duration_minutes}min\n\n"
                    f"Session Summary:\n{session_summary}\n\n"
                    "Please update the student's memory blocks based on this session. "
                    "Update learning_style if you noticed patterns. "
                    "Update knowledge_state with new mastery or misconceptions. "
                    "Update interests if the student showed excitement about specific topics."
                ),
            }
        ],
    )
```

### Injecting Memory into Companion Prompts

```python
# In graphs/observation.py — modify build_observation_graph

def build_observation_graph(topic_config, reaction_registry, student_memory=None):
    """Build observation graph with optional student memory context."""
    
    # ... existing code ...
    
    async def ai_reasoning(state, config):
        """LLM decides companion reaction — now memory-informed."""
        
        memory_context = ""
        if student_memory:
            memory_context = f"""
STUDENT MEMORY (from past sessions):
- Profile: {student_memory.get('student_profile', 'Unknown')}
- Learning Style: {student_memory.get('learning_style', 'Unknown')}
- Knowledge: {student_memory.get('knowledge_state', 'Unknown')}
- Interests: {student_memory.get('interests', 'Unknown')}

Use this to personalize your reaction. Reference their interests.
Adapt to their learning style. Address known misconceptions.
"""
        
        prompt = f"""{topic_config.pedagogical_prompt}

{memory_context}

CURRENT SIMULATION STATE:
{state["simulation"]}
...
"""
        # ... rest of ai_reasoning
```

---

## 6. Docker Compose (Updated)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: omniscience-backend
    ports:
      - "8124:8123"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY:-}
      - LETTA_BASE_URL=http://letta:8283
    env_file:
      - .env
    depends_on:
      letta:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: omniscience-frontend
    ports:
      - "3082:3000"
    environment:
      - BACKEND_URL=http://backend:8123
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  letta:
    image: letta/letta:latest
    container_name: omniscience-letta
    ports:
      - "8283:8283"
    volumes:
      - letta_data:/var/lib/postgresql/data
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8283/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped

volumes:
  letta_data:

networks:
  default:
    name: omniscience-network
```

---

## 7. New Environment Variables

```bash
# .env.example — v3 additions

# Supabase Cloud (Auth + Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Backend only, never expose to client

# Letta (Student Memory) — self-hosted via Docker
LETTA_BASE_URL=http://localhost:8283
# Letta uses GOOGLE_API_KEY for Gemini (already defined)

# Existing (unchanged)
GOOGLE_API_KEY=your-gemini-key
LANGSMITH_API_KEY=optional
```

---

## 8. New Dependencies

### Frontend (package.json additions)

```json
{
  "@supabase/supabase-js": "^2.45.0",
  "@supabase/ssr": "^0.5.0",
  "@codesandbox/sandpack-react": "^2.19.0"
}
```

### Backend (pyproject.toml additions)

```toml
[project]
dependencies = [
    # ... existing deps ...
    "letta-client>=1.0.0",
]
```

---

## 9. Slice Plan

### Dependency Graph

```
Slice 8 (auth)
  ├── Slice 9 (teacher dashboard shell)
  │     └── Slice 10 (course builder: chat-first UI)
  │           └── Slice 11 (course builder: agent tools + preview)
  └── Slice 12 (Letta integration)
        └── Slice 13 (memory-informed companions)

Parallel: 9 and 12 can run in parallel after 8.
Sequential: 10→11 must be in order.
```

---

### Slice 8 — Auth + Profiles

**Deliver:**
- Supabase Cloud project setup (create project at supabase.com)
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Database migration: `profiles` table, `courses` table, `student_progress` table, RLS policies
- `app/(auth)/login/page.tsx` — Email/password login (Supabase Auth UI or custom)
- `app/(auth)/signup/page.tsx` — Signup with role selection (student/teacher)
- Auth callback route
- `contexts/AuthContext.tsx` — Provider with `useAuth()` hook
- Protect existing routes: wrap `(student)` group, redirect if unauthenticated

**Acceptance:**
- Can sign up as student → sees current homepage
- Can sign up as teacher → redirected to empty dashboard
- Unauthenticated → redirected to login
- Student cannot access teacher routes

---

### Slice 9 — Teacher Dashboard Shell

**Deliver:**
- `app/(teacher)/layout.tsx` — Sidebar nav, muted theme variant
- `app/(teacher)/dashboard/page.tsx` — "My Courses" list (empty state for now), "Create New" button
- `components/teacher/CourseCard.tsx` — Card showing course title, format badge, status
- `components/teacher/TeacherNav.tsx` — Sidebar with Dashboard, Create, Settings links
- Apply teacher design language (thinner borders, muted palette, `shadow-sm`)

**Acceptance:**
- Teacher logs in → sees dashboard with empty state
- "Create New Course" button navigates to `/courses/new`
- Teacher nav sidebar works
- Visual style is clearly "professional sibling" of student UI

---

### Slice 10 — Course Builder: Chat-First UI

**Deliver:**
- `app/(teacher)/courses/new/page.tsx` — Renders `CourseBuilder` component
- `components/teacher/CourseBuilder.tsx` — Three-phase UI:
  - Phase 1 (landing): centered chat input + template cards
  - Phase 2 (chat): fullscreen chat, no preview yet
  - Phase 3 (split): chat + Sandpack preview (placeholder — no AI yet)
- `components/teacher/TemplateCard.tsx` — Clickable template cards
- Sandpack integration: `SandpackProvider` + `SandpackPreview`, framer-motion + Tailwind CDN
- Chat UI: message list, input, loading state, auto-scroll
- Manual test: hardcode a tool call response to verify split-pane transition works
- Install `@codesandbox/sandpack-react`

**Acceptance:**
- Teacher opens `/courses/new` → sees centered chatbot UI with template cards below
- Clicking a template card seeds the conversation and transitions to fullscreen chat
- Typing a message transitions to fullscreen chat
- Manually triggering a file update transitions to split pane with live Sandpack preview
- Preview shows companion bubble when events fire from template
- Transition animations are smooth

---

### Slice 11 — Course Builder: Agent Tools + Preview

**Deliver:**
- `agent/graphs/course_builder.py` — ReAct agent with `write_file` + `update_file` tools, Gemini 3.1 Pro
- System prompt with format contracts, rules, interaction JSON schema
- `app/api/course-builder/route.ts` — Next.js API route forwarding to FastAPI
- Register `course-builder` agent in `agent/main.py`
- Wire chat UI to API: send messages, process tool calls, update Sandpack files
- Handle `update_file` (string replacement in current file content)
- Handle `write_file` (full file replacement)
- "Save Draft" button storing JSX + interactions JSON to Supabase `courses` table

**Acceptance:**
- Teacher types "Create a water cycle lesson for 7-year-olds" → AI asks a clarifying question or two → AI generates JSX + interactions.json → preview slides in and renders the simulation
- Teacher says "Make the clouds bigger" → AI calls `update_file` → targeted edit → preview updates
- Teacher says "Add an interaction when it rains" → AI updates interactions.json → companion bubble appears on event
- "Save Draft" persists the course to Supabase
- Errors in generated code show Sandpack error overlay (teacher can ask AI to fix)

---

### Slice 12 — Letta Integration

**Deliver:**
- Add `letta` service to `docker-compose.yml`
- `agent/memory/letta_client.py` — Client wrapper: `create_student_agent`, `get_student_memory`, `update_student_memory_after_session`
- On student signup: create Letta agent, store `letta_agent_id` in profiles
- `pip install letta-client` in agent dependencies
- Health check endpoint for Letta service
- Test script: create agent, write memory blocks, read them back

**Acceptance:**
- `docker compose up` → Letta server starts alongside backend/frontend
- New student signup → Letta agent created with 4 memory blocks
- `get_student_memory(agent_id)` returns correct block values
- `update_student_memory_after_session()` → Letta agent self-edits blocks based on session data

---

### Slice 13 — Memory-Informed Companions

**Deliver:**
- On topic/course load: fetch student's Letta memory → inject into agent system prompts
- Modify `build_observation_graph` and `build_chat_graph` to accept `student_memory` parameter
- After session end (page unload or explicit "done"): generate session summary, send to Letta
- Memory context appears in companion reactions (personalized messages)
- Student profile page showing their memory blocks (read-only, friendly format)

**Acceptance:**
- Student completes a session → memory blocks update with new knowledge/interests
- Next session → companion references past sessions ("Remember when you discovered gas phase?")
- Student who "likes visual learning" gets different companion behavior than one who "prefers questions"
- Memory persists across browser sessions (Letta server-side)

---

## 10. Future Work (Not in Current Slices)

### Publishing + Student Access to Teacher-Created Courses

The current slice plan stops at "Save Draft." Publishing requires several design decisions that aren't ready yet:

**Open questions:**
- **Discovery UX:** How do published courses appear alongside built-in topics in the student carousel? Do they get their own section? How does a student differentiate teacher-created from built-in?
- **Companion integration:** Teacher-created courses use a mechanical `interactions.json` for companion behavior. Built-in topics use the full LangGraph observation agent. Should published courses get a lightweight real-time companion, or is the JSON-driven bubble sufficient for v3?
- **Course metadata & thumbnails:** Auto-generating a thumbnail from the simulation (screenshot? canvas capture?) or requiring the teacher to upload one. Age-range filtering, subject tagging, search.
- **Edit-after-publish:** If a teacher edits a published course, does it create a new version? Do students currently mid-course get the old or new version?
- **Sandpack security:** Published courses run arbitrary JSX in Sandpack iframes on the student's browser. Need to audit what a malicious teacher could inject. Sandpack's iframe isolation helps, but CSP headers and input sanitization need thought.
- **Course quality control:** Should there be a review/approval flow before courses become visible to students? Or is this a "publish and share link" model initially?

**Planned approach (to be detailed in a future slice):**
- "Publish" button in course builder changes `status` to `published`
- Published courses render via Sandpack in `app/(student)/courses/[id]/page.tsx`
- Companion behavior uses `interactions.json` directly (no LangGraph agent for teacher-created courses in v3)
- Discovery: separate "Community Courses" section in student dashboard

---

## 11. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Formats | 2: Lab + Quiz | Covers 95% of interactive ed content. Keeps template library small. |
| Auth | Supabase Cloud | Zero infra overhead for prototype. Can self-host later for China deployment. Free tier 50k MAU. |
| DB | Supabase PostgreSQL | Same service as auth, RLS built-in, JSONB for flexible schemas |
| Course builder model | Gemini 3.1 Pro (`gemini-3.1-pro-preview`) | Best reasoning + code gen for teacher-facing creative agent. Improved agentic tool use over Flash. |
| Course builder UX | Chat-first → preview-on-demand | Teachers aren't developers. Familiar chatbot reduces cognitive load. Preview appears naturally when code exists. |
| Agent framework | LangGraph `create_react_agent` | Consistent with existing agents, proven tool calling pattern |
| Agent tools | `write_file` + `update_file` | Minimal surface area, maps to Sandpack file updates |
| Live preview | Sandpack | Free, in-browser, instant reload, React + Tailwind + framer-motion |
| Student memory | Letta (self-hosted Docker) | Self-editing memory, sleep-time compute, model-agnostic, Docker-native |
| Letta model | Gemini 2.5 Flash | Memory management doesn't need Pro-level reasoning. Flash is cheaper for background processing. |
| Interaction format | JSON (not Python registry) | Frontend-only companion for prototype. Mechanical conversion to ReactionRegistry later. |
| Publishing | Deferred to future slice | Open UX/security questions. Save Draft is sufficient for builder validation. |
| Teacher UI design | Muted sibling of student | Same fonts, thinner borders, subtler shadows, professional layout |
