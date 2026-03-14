# Course Files Storage Migration Summary

## What Changed

### Database Schema

**Added:**
- `files` JSONB column - stores all course files as `{ "/App.js": "...", "/Simulation.js": "...", ... }`
- `related_topics` TEXT[] column - array of topic IDs/keywords for categorization
- `validate_course_files()` function - validates required files per format
- `jsonb_has_keys()` helper function - checks if JSONB has required keys
- `courses_files_valid` CHECK constraint - enforces file validation for published courses
- GIN indexes on `files` and `related_topics` for fast queries

**Updated:**
- `format` constraint: `('lab', 'quiz')` → `('lab', 'quiz', 'dialogue')`
- `status` constraint: `('draft', 'published')` → `('saved', 'pending-review', 'published')`
- `status` default: `'draft'` → `'saved'`

**Removed:**
- `age_range` column (no longer needed)

**Deprecated (still present, will remove later):**
- `simulation_jsx` - moved to `files['/Simulation.js']`
- `interactions_json` - moved to `files['/data.json']`
- `companion_config` - moved to `files['/data.json']`

### TypeScript Types

Updated `lib/types/course-builder.ts`:
```typescript
export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  format: CourseFormat;  // "lab" | "quiz" | "dialogue"
  related_topics: string[];
  status: "saved" | "pending-review" | "published";
  files: Record<string, string>;  // { "/App.js": "...", ... }
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}
```

## Validation Rules

### File Requirements (all formats currently identical)

| Format | Required Files |
|--------|---------------|
| `lab` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |
| `quiz` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |
| `dialogue` | `/App.js`, `/Simulation.js`, `/state.json`, `/data.json` |

### Status Workflow

```
saved (draft) → pending-review → published
```

- **saved**: Work in progress, files can be incomplete
- **pending-review**: Submitted for review, files can be incomplete
- **published**: Live for students, **must have all required files**

The `courses_files_valid` constraint only validates when `status = 'published'`.

## Data Migration

**Before migration:**
- 3 courses in database
- 2 with `status = 'published'` (but empty files)
- 1 with `status = 'draft'`

**After migration:**
- All 3 courses have `status = 'saved'`
- Published courses were downgraded to `saved` because they had empty `files`
- All courses have `files = {}` and `related_topics = []` (defaults)

## Next Steps

1. **Update API routes** to read/write `files` column instead of old columns
2. **Update CourseBuilder.tsx** to sync `files` state with database
3. **Test file validation** - try publishing a course without required files (should fail)
4. **Remove deprecated columns** after confirming everything works:
   ```sql
   ALTER TABLE public.courses
   DROP COLUMN simulation_jsx,
   DROP COLUMN interactions_json,
   DROP COLUMN companion_config;
   ```

## Testing the Migration

```bash
# Test 1: Insert a saved course with empty files (should succeed)
docker exec omniscience-supabase-db psql -U postgres -d postgres -c "
INSERT INTO public.courses (teacher_id, title, format, status, files)
VALUES (
  (SELECT id FROM public.profiles LIMIT 1),
  'Test Course',
  'lab',
  'saved',
  '{}'::jsonb
);
"

# Test 2: Try to publish a course without files (should fail)
docker exec omniscience-supabase-db psql -U postgres -d postgres -c "
UPDATE public.courses
SET status = 'published'
WHERE title = 'Test Course';
"
# Expected: ERROR: check constraint "courses_files_valid" is violated

# Test 3: Add files and publish (should succeed)
docker exec omniscience-supabase-db psql -U postgres -d postgres -c "
UPDATE public.courses
SET files = '{
  \"/App.js\": \"content\",
  \"/Simulation.js\": \"content\",
  \"/state.json\": \"{}\",
  \"/data.json\": \"{}\"
}'::jsonb,
status = 'published'
WHERE title = 'Test Course';
"
```

## Rollback (if needed)

```sql
-- Drop new columns
ALTER TABLE public.courses
DROP COLUMN IF EXISTS files,
DROP COLUMN IF EXISTS related_topics;

-- Restore old constraints
ALTER TABLE public.courses
DROP CONSTRAINT courses_format_check,
DROP CONSTRAINT courses_status_check;

ALTER TABLE public.courses
ADD CONSTRAINT courses_format_check CHECK (format IN ('lab', 'quiz')),
ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'published'));

ALTER TABLE public.courses
ALTER COLUMN status SET DEFAULT 'draft';

-- Restore age_range
ALTER TABLE public.courses
ADD COLUMN age_range int4range;

-- Drop functions
DROP FUNCTION IF EXISTS validate_course_files(TEXT, JSONB);
DROP FUNCTION IF EXISTS jsonb_has_keys(JSONB, TEXT[]);

-- Update data
UPDATE public.courses SET status = 'draft' WHERE status = 'saved';
```
