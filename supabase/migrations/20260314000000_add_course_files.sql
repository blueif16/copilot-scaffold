-- Add files JSONB column to courses table with format-specific validation
-- Migration: 20260314000000_add_course_files.sql

-- ============================================================================
-- STEP 1: ADD NEW COLUMNS
-- ============================================================================

-- Add files column (JSONB for flexible file storage)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '{}'::jsonb;

-- Add related_topics column (array of topic IDs/keywords)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS related_topics TEXT[] DEFAULT '{}';

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA FIRST (before adding constraints)
-- ============================================================================

-- Update existing 'draft' status to 'saved' BEFORE adding new constraint
UPDATE public.courses SET status = 'saved' WHERE status = 'draft';

-- ============================================================================
-- STEP 3: UPDATE CONSTRAINTS
-- ============================================================================

-- Drop old format constraint and add new one with 'dialogue'
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_format_check;

ALTER TABLE public.courses
ADD CONSTRAINT courses_format_check CHECK (format IN ('lab', 'quiz', 'dialogue'));

-- Drop old status constraint and add new one with updated values
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_status_check;

ALTER TABLE public.courses
ADD CONSTRAINT courses_status_check CHECK (status IN ('saved', 'pending-review', 'published'));

-- Update default status value from 'draft' to 'saved'
ALTER TABLE public.courses
ALTER COLUMN status SET DEFAULT 'saved';

-- ============================================================================
-- STEP 4: REMOVE DEPRECATED COLUMNS
-- ============================================================================

-- Remove deprecated columns (simulation_jsx, interactions_json, companion_config)
-- These are now stored in the files JSONB column
ALTER TABLE public.courses
DROP COLUMN IF EXISTS age_range,
DROP COLUMN IF EXISTS simulation_jsx,
DROP COLUMN IF EXISTS interactions_json,
DROP COLUMN IF EXISTS companion_config;

-- ============================================================================
-- STEP 5: VALIDATION FUNCTIONS
-- ============================================================================

-- Check if all required keys exist in JSONB object
CREATE OR REPLACE FUNCTION jsonb_has_keys(obj JSONB, required_keys TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT bool_and(obj ? key)
    FROM unnest(required_keys) AS key
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate files structure based on format
CREATE OR REPLACE FUNCTION validate_course_files(format TEXT, files JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Lab format: requires /App.js, /Simulation.js, /state.json, /data.json
  IF format = 'lab' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);

  -- Quiz format: requires /App.js, /Simulation.js, /state.json, /data.json
  ELSIF format = 'quiz' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);

  -- Dialogue format: requires /App.js, /Simulation.js, /state.json, /data.json
  ELSIF format = 'dialogue' THEN
    RETURN jsonb_has_keys(files, ARRAY['/App.js', '/Simulation.js', '/state.json', '/data.json']);

  -- Unknown format or saved/pending-review without files yet
  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 6: FIX EXISTING DATA BEFORE CONSTRAINT
-- ============================================================================

-- Delete test courses with empty files (they violate the new constraint)
-- In production, you would migrate the data instead
DELETE FROM public.courses WHERE files = '{}'::jsonb OR files IS NULL;

-- ============================================================================
-- STEP 7: ADD CHECK CONSTRAINT
-- ============================================================================

-- ALWAYS validate files - no exceptions for saved/pending-review
-- When user clicks "Save", files must be complete
ALTER TABLE public.courses
ADD CONSTRAINT courses_files_valid CHECK (validate_course_files(format, files));

-- ============================================================================
-- STEP 8: COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.courses.files IS
'JSONB object storing course files. Structure: { "/App.js": "content", "/Simulation.js": "content", ... }. Required files validated per format on every INSERT/UPDATE. User must have complete files before clicking Save.';

COMMENT ON COLUMN public.courses.related_topics IS
'Array of related topic IDs or keywords for categorization and discovery.';

COMMENT ON COLUMN public.courses.status IS
'Course publication status: saved (draft/work-in-progress), pending-review (submitted for review), published (live for students).';

COMMENT ON FUNCTION validate_course_files IS
'Validates that required files exist for each format. Lab/Quiz/Dialogue currently require: /App.js, /Simulation.js, /state.json, /data.json. Extend this function when adding new formats or changing requirements.';

-- ============================================================================
-- STEP 9: INDEXES
-- ============================================================================

-- GIN index for JSONB queries (useful for searching file content)
CREATE INDEX IF NOT EXISTS courses_files_gin_idx ON public.courses USING GIN (files);

-- GIN index for related_topics array queries
CREATE INDEX IF NOT EXISTS courses_related_topics_gin_idx ON public.courses USING GIN (related_topics);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- To add a new format or change required files:
-- 1. Update validate_course_files() function with new format/requirements
-- 2. No schema migration needed - JSONB is flexible
-- 3. Existing data remains valid (constraint only checks on INSERT/UPDATE)

-- Example: Add a new format that needs only 2 files
-- CREATE OR REPLACE FUNCTION validate_course_files(format TEXT, files JSONB) ...
--   ELSIF format = 'flashcard' THEN
--     RETURN jsonb_has_keys(files, ARRAY['/Cards.js', '/config.json']);
