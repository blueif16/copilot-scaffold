# Course Files Storage Architecture

## Overview

Course files are stored in a **single JSONB column** with **PostgreSQL validation constraints** (similar to Pydantic but at the database level).

## Schema

```sql
-- courses table
ALTER TABLE public.courses
ADD COLUMN files JSONB DEFAULT '{}'::jsonb;
```

**Structure:**
```json
{
  "/App.js": "import { useState } from 'react'...",
  "/Simulation.js": "export default function Simulation({ state, onStateChange, onEvent }) {...}",
  "/state.json": "{\"state\": {...}, \"events\": {...}}",
  "/data.json": "{\"topic\": {...}, \"reactions\": [...]}"
}
```

## Validation

### Current Requirements (all formats)

| Format | Required Files |
|--------|---------------|
| `lab` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |
| `quiz` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |
| `dialogue` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |

### Validation Logic

```sql
-- Only validates when status = 'published'
-- Drafts can have incomplete files
ALTER TABLE public.courses
ADD CONSTRAINT courses_files_valid CHECK (
  status = 'draft' OR validate_course_files(format, files)
);
```

**Key function:** `validate_course_files(format TEXT, files JSONB)`
- Returns `TRUE` if all required files exist
- Returns `FALSE` if any required file is missing
- Drafts bypass validation (can save incomplete work)

## Why JSONB + Validation?

### ✅ Advantages

1. **Flexible schema** - Add new formats without ALTER TABLE
2. **Type-safe at DB level** - Validation enforces required files
3. **Simple queries** - Single row fetch, no JOINs
4. **Matches LangGraph checkpoint pattern** - Same storage model as agent state
5. **Easy to evolve** - Just update `validate_course_files()` function

### ❌ Alternatives Rejected

**Option 1: Multiple columns** (`simulation_jsx`, `state_json`, `data_json`, `app_jsx`)
- ❌ Not flexible - quiz might not need all columns
- ❌ Schema migration needed for new formats
- ❌ NULL handling complexity

**Option 2: Separate `course_files` table**
- ❌ Requires JOIN for every query
- ❌ More complex to maintain
- ❌ Overkill for fixed file count per format

## Adding New Formats

### Example: Add a `flashcard` format that only needs 2 files

```sql
-- 1. Update validation function
CREATE OR REPLACE FUNCTION validate_course_files(format TEXT, files JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF format = 'lab' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);
  ELSIF format = 'quiz' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);
  ELSIF format = 'dialogue' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);

  -- NEW FORMAT
  ELSIF format = 'flashcard' THEN
    RETURN jsonb_has_keys(files, ARRAY['/Cards.js', '/config.json']);

  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update format enum
ALTER TABLE public.courses
DROP CONSTRAINT courses_format_check;

ALTER TABLE public.courses
ADD CONSTRAINT courses_format_check CHECK (format IN ('lab', 'quiz', 'dialogue', 'flashcard'));

-- 3. Update TypeScript types
-- lib/types/course-builder.ts
export type CourseFormat = "lab" | "quiz" | "dialogue" | "flashcard";

-- 4. Add template scaffold
-- lib/templates.ts
case "flashcard":
  return {
    "/Cards.js": FLASHCARD_SCAFFOLD,
    "/config.json": FLASHCARD_CONFIG_SCAFFOLD,
  };
```

**No data migration needed** - existing courses remain valid.

## Format-Specific Transformations

Each format has different **promotion logic** (draft → published):

### Lab Format
```typescript
// Transform: Sandpack files → Production topic
{
  "/App.js": "...",           // → DISCARD (Sandpack host only)
  "/Simulation.js": "...",    // → topics/[id]/TopicNameSimulation.tsx
  "/state.json": "...",       // → types.ts + Python state schema
  "/data.json": "..."         // → config.py + reactions.py
}
```

### Quiz Format
```typescript
// Transform: Sandpack files → Production quiz
{
  "/App.js": "...",           // → DISCARD
  "/Simulation.js": "...",    // → topics/[id]/QuizComponent.tsx
  "/state.json": "...",       // → quiz state types
  "/data.json": "..."         // → questions.json + scoring config
}
```

### Dialogue Format
```typescript
// Transform: Sandpack files → Production dialogue
{
  "/App.js": "...",           // → DISCARD
  "/Simulation.js": "...",    // → topics/[id]/DialogueComponent.tsx
  "/state.json": "...",       // → dialogue state types
  "/data.json": "..."         // → story.json + branches config
}
```

**Implementation:** Each format has a dedicated transformer function in `lib/course-promotion/`.

## Current State

- ✅ Migration created: `20260314000000_add_course_files.sql`
- ✅ Migration applied to database
- ✅ Validation functions defined
- ✅ CHECK constraint added
- ✅ New columns added: `files` (JSONB), `related_topics` (TEXT[])
- ✅ Old column removed: `age_range`
- ✅ Status values updated: `draft` → `saved`, added `pending-review`
- ✅ Format constraint updated: added `dialogue`
- ✅ Existing data migrated (3 courses, 2 published → saved due to empty files)
- ✅ TypeScript types updated
- ⏳ API routes need update to use `files` column
- ⏳ Old columns (`simulation_jsx`, `interactions_json`, `companion_config`) marked DEPRECATED, can be removed after full migration
- ⏳ Promotion transformers not yet implemented

## Next Steps

1. Update TypeScript types to include `files: Record<string, string>`
2. Update API routes to read/write `files` column
3. Remove old columns (`simulation_jsx`, `interactions_json`, `companion_config`) after migration
4. Implement promotion transformers per format
