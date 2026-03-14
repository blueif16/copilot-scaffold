-- Add conversation_id column to courses table
-- Migration: 20260314000001_add_conversation_id.sql

-- Add conversation_id column (nullable, links to course_builder_conversations)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.course_builder_conversations(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS courses_conversation_id_idx ON public.courses(conversation_id);

-- Comment
COMMENT ON COLUMN public.courses.conversation_id IS
'Optional reference to the course builder conversation that created this course. Allows linking saved courses back to their creation context.';
