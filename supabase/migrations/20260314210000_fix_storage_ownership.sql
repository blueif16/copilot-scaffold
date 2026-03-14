-- Fix storage table ownership and role permissions
-- This resolves "new row violates row-level security policy" errors

-- CRITICAL: Grant BYPASSRLS to storage admin (allows storage service to manage auth internally)
ALTER ROLE supabase_storage_admin WITH BYPASSRLS;

-- Grant all roles to storage admin (allows role switching for authenticated/anon/service_role)
GRANT anon TO supabase_storage_admin;
GRANT authenticated TO supabase_storage_admin;
GRANT service_role TO supabase_storage_admin;
GRANT supabase_storage_admin TO authenticator;

-- Grant table permissions to authenticated and service_role
GRANT INSERT, SELECT ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;

-- Set correct table ownership (storage service needs to own these tables)
ALTER TABLE storage.objects OWNER TO supabase_storage_admin;
ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

-- ENABLE RLS on storage tables (this is the correct approach)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS course_thumbnails_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS course_thumbnails_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS course_thumbnails_authenticated_delete ON storage.objects;
DROP POLICY IF EXISTS course_thumbnails_public_read ON storage.objects;

-- Create proper RLS policies for course-thumbnails bucket
CREATE POLICY "Allow authenticated uploads to course-thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails');

CREATE POLICY "Allow public reads from course-thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-thumbnails');
