-- Add RLS policies for courses table
-- Migration: 20260314000002_add_courses_rls_policies.sql

-- Enable RLS on courses table (if not already enabled)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Teachers can insert their own courses
CREATE POLICY "Teachers can insert their own courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can view their own courses
CREATE POLICY "Teachers can view their own courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can update their own courses
CREATE POLICY "Teachers can update their own courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
)
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can delete their own courses
CREATE POLICY "Teachers can delete their own courses"
ON public.courses
FOR DELETE
TO authenticated
USING (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);
