# Storage Upload - COMPLETE SOLUTION

## The Problem

Authenticated users couldn't upload files to Supabase storage, getting "new row violates row-level security policy" errors.

## The Complete Solution

**Three components are required:**

### 1. Role Privileges
```sql
ALTER ROLE supabase_storage_admin WITH BYPASSRLS;
GRANT anon TO supabase_storage_admin;
GRANT authenticated TO supabase_storage_admin;
GRANT service_role TO supabase_storage_admin;
```

### 2. Table Grants (CRITICAL)
```sql
GRANT INSERT, SELECT ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;
```

### 3. RLS Policies
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated uploads to course-thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails');

CREATE POLICY "Allow public reads from course-thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course-thumbnails');
```

## Why All Three Are Needed

1. **BYPASSRLS** - Allows storage service to manage auth internally
2. **Table grants** - Give the authenticated role permission to INSERT
3. **RLS policies** - Define the conditions (bucket_id check)

**RLS policies alone are NOT enough** - you must also grant table privileges to the role.

## Migration Applied

`supabase/migrations/20260314210000_fix_storage_ownership.sql`

## Test

Frontend thumbnail upload should now work for authenticated users.
