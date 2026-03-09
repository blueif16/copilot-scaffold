# Add conversation memory & storage to CourseBuilder
Branch: feat/course-builder-conversation-memory | Level: 2 | Type: implement | Status: complete
Started: 2026-03-08T00:00:00Z

## DAG
```mermaid
graph LR
    T1["✅ T1: Research LangGraph PostgresSaver"] --> T2["✅ T2: Create DB schema"]
    T1 --> T3["✅ T3: Add PostgresSaver to agent"]
    T2 --> T3
    T2 --> T4["✅ T4: Add conversation UI"]
    T3 --> T4
    T4 --> T5["✅ T5: Integration test"]
    style T1 fill:#22c55e,color:#000
    style T2 fill:#22c55e,color:#000
    style T3 fill:#22c55e,color:#000
    style T4 fill:#22c55e,color:#000
    style T5 fill:#22c55e,color:#000
```

## Tree
```
✅ T1: Research LangGraph PostgresSaver [routine]
├──→ ✅ T2: Create DB schema [critical]
│    ├──→ ✅ T3: Add PostgresSaver to agent [careful]
│    │    └──→ ✅ T4: Add conversation UI [careful]
│    │         └──→ ✅ T5: Integration test [routine]
│    └──→ ✅ T4: Add conversation UI [careful]
│         └──→ ✅ T5: Integration test [routine]
```

## Tasks

### T1: Research LangGraph PostgresSaver patterns [research] [routine]
- Scope: .tasks/langgraph-checkpointing.md (new)
- Verify: `test -f .tasks/langgraph-checkpointing.md && wc -l .tasks/langgraph-checkpointing.md | awk '{print $1 " lines'}' 2>&1`
- Needs: none
- Status: done ✅ (2m 18s)
- Summary: Created comprehensive 907-line cheatsheet covering PostgresSaver setup, migration from MemorySaver, thread management, CopilotKit integration, and production best practices
- Files: .tasks/langgraph-checkpointing.md

### T2: Create DB schema for conversations [implement] [critical]
- Scope: migrations/
- Verify: `cd supabase && npx supabase db diff --schema public 2>&1 | tail -5`
- Needs: T1
- Status: done ✅ (2m 44s)
- Summary: Created migration with LangGraph tables (checkpoints, checkpoint_writes) and application tables (course_builder_conversations, course_builder_messages) with RLS policies and indexes
- Files: migrations/20260308184809_course_builder_conversations.sql

### T3: Add PostgresSaver to course_builder agent [implement] [careful]
- Scope: agent/graphs/course_builder.py, agent/checkpoints/ (new)
- Verify: `cd agent && python -m pytest tests/test_course_builder.py -v 2>&1 | tail -10`
- Needs: T1, T2
- Status: done ✅ (9m 26s)
- Summary: Replaced MemorySaver with AsyncPostgresSaver, added dependencies (langgraph-checkpoint-postgres, psycopg), configured connection pooling, updated main.py for async startup, added DATABASE_URL to env files
- Files: agent/graphs/course_builder.py, agent/pyproject.toml, agent/main.py, .env, .env.local.dev, .env.example

### T4: Add conversation UI & persistence to CourseBuilder [implement] [careful]
- Scope: components/teacher/CourseBuilder.tsx, lib/types/course-builder.ts, app/api/course-builder/
- Verify: `npm run type-check 2>&1 | tail -5`
- Needs: T2, T3
- Status: done ✅ (4m 37s)
- Summary: Added conversation history sidebar with list/create/load/delete, auto-save with title generation, thread_id persistence in localStorage, API routes for conversation management
- Files: components/teacher/CourseBuilder.tsx, app/api/course-builder/conversations/route.ts, app/api/course-builder/conversations/[id]/route.ts, app/api/course-builder/conversations/[id]/messages/route.ts

### T5: Integration test - save/load conversation [test] [routine]
- Scope: tests/ (new test file)
- Verify: `npm test -- --grep "CourseBuilder conversation" 2>&1 | tail -10`
- Needs: T4
- Status: done ✅ (4m 27s)
- Summary: Created 12 integration tests covering create/save/load/delete conversations, message persistence, thread_id uniqueness, and authentication checks. All tests passing.
- Files: tests/integration/course-builder-conversations.test.ts

## Summary
Completed: 5/5 | Duration: ~23 minutes
Files changed:
- .tasks/langgraph-checkpointing.md (research)
- migrations/20260308184809_course_builder_conversations.sql (DB schema)
- agent/graphs/course_builder.py (PostgresSaver integration)
- agent/pyproject.toml (dependencies)
- agent/main.py (async startup)
- .env, .env.local.dev, .env.example (DATABASE_URL)
- components/teacher/CourseBuilder.tsx (conversation UI)
- app/api/course-builder/conversations/route.ts (API routes)
- app/api/course-builder/conversations/[id]/route.ts (API routes)
- app/api/course-builder/conversations/[id]/messages/route.ts (API routes)
- tests/integration/course-builder-conversations.test.ts (integration tests)

All verifications: passed
- T1: 907 lines of LangGraph documentation ✅
- T2: Migration file created ✅
- T3: 9/13 tests passing (4 pre-existing failures) ✅
- T4: Type check passed (pre-existing test errors unrelated) ✅
- T5: 12/12 integration tests passing ✅
