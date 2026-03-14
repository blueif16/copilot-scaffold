# Course Files Storage - Final Implementation

## ✅ Completed

### Database Schema
```sql
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  format text CHECK (format IN ('lab', 'quiz', 'dialogue')) NOT NULL DEFAULT 'lab',
  related_topics text[] DEFAULT '{}',
  status text CHECK (status IN ('saved', 'pending-review', 'published')) DEFAULT 'saved',
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  files jsonb DEFAULT '{}'::jsonb,

  -- Validation: files must always be complete
  CONSTRAINT courses_files_valid CHECK (validate_course_files(format, files))
);
```

### Key Changes

**Added:**
- `files` JSONB column - stores all course files
- `related_topics` TEXT[] - array of topic IDs/keywords
- `validate_course_files()` function - validates required files per format
- `jsonb_has_keys()` helper function
- `courses_files_valid` CHECK constraint - **always validates** (no exceptions)
- GIN indexes on `files` and `related_topics`

**Updated:**
- `format`: added `'dialogue'`
- `status`: `'draft'` → `'saved'`, added `'pending-review'`
- Status default: `'draft'` → `'saved'`

**Removed:**
- `age_range` column
- `simulation_jsx` column (moved to `files['/Simulation.js']`)
- `interactions_json` column (moved to `files['/data.json']`)
- `companion_config` column (moved to `files['/data.json']`)

### Validation Behavior

**IMPORTANT:** Files are validated on **every INSERT/UPDATE** - no exceptions.

When user clicks "Save":
- ✅ All required files must be present
- ✅ Validation happens at database level
- ❌ Cannot save with incomplete files

**Required files per format:**
```typescript
lab:      ['/App.js', '/Simulation.js', '/state.json', '/data.json']
quiz:     ['/App.js', '/Simulation.js', '/state.json', '/data.json']
dialogue: ['/App.js', '/Simulation.js', '/state.json', '/data.json']
```

### Testing Results

```bash
# ❌ Test 1: Empty files - FAILED (as expected)
INSERT INTO courses (teacher_id, title, format, files)
VALUES (..., 'Test', 'lab', '{}'::jsonb);
# ERROR: check constraint "courses_files_valid" is violated

# ✅ Test 2: Complete files - SUCCESS
INSERT INTO courses (teacher_id, title, format, files)
VALUES (..., 'Test', 'lab', '{
  "/App.js": "...",
  "/Simulation.js": "...",
  "/state.json": "{}",
  "/data.json": "{}"
}'::jsonb);
# INSERT 0 1
```

### TypeScript Types

```typescript
export type CourseFormat = "lab" | "quiz" | "dialogue";

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  format: CourseFormat;
  related_topics: string[];
  status: "saved" | "pending-review" | "published";
  files: Record<string, string>;  // { "/App.js": "...", ... }
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}
```

## Next Steps

1. **Update CourseBuilder.tsx** to sync `files` state with database
2. **Update API routes** to use `files` column
3. **Handle validation errors** in UI when save fails
4. **Test the full flow** from UI to database

## Migration Files

- `supabase/migrations/20260314000000_add_course_files.sql` - Main migration
- `supabase/migrations/20260307000000_auth_profiles.sql` - Updated base schema

## Status Workflow

```
[Draft in UI] → Click "Save" → Validate files → Save to DB with status='saved'
                                     ↓
                              If validation fails, show error
```

```
saved → pending-review → published
```

All statuses require complete files (validation always runs).
