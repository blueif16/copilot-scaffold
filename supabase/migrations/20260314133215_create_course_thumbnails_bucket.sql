-- Create Storage Bucket for Course Thumbnails
-- Allows teachers to upload thumbnails for their courses with public read access

-- ============================================================================
-- CREATE BUCKET
-- ============================================================================
-- Insert bucket into storage.buckets table
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-thumbnails',
  'course-thumbnails',
  true,  -- public read access
  5242880,  -- 5MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- RLS POLICIES FOR storage.objects
-- ============================================================================
-- Enable RLS on storage.objects (should already be enabled, but ensure it)
alter table storage.objects enable row level security;

-- Policy: Anyone can view/download thumbnails (public read)
create policy "Public read access for course thumbnails"
on storage.objects
for select
to public
using (bucket_id = 'course-thumbnails');

-- Policy: Teachers can upload thumbnails for their own courses
-- Filename format: {course_id}.{ext} or {course_id}/{filename}.{ext}
create policy "Teachers can upload course thumbnails"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-thumbnails'
  and (
    -- User must be a teacher
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'teacher'
    )
  )
);

-- Policy: Teachers can update their own course thumbnails
create policy "Teachers can update own course thumbnails"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-thumbnails'
  and (
    -- User must be a teacher
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'teacher'
    )
  )
);

-- Policy: Teachers can delete their own course thumbnails
create policy "Teachers can delete own course thumbnails"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-thumbnails'
  and (
    -- User must be a teacher
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'teacher'
    )
  )
);
