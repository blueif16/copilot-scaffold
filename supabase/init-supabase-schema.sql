-- Supabase Initialization Script
-- This script runs on first database startup via docker-entrypoint-initdb.d
-- Creates all required Supabase schemas, roles, and application tables

-- ============================================================================
-- SUPABASE ROLES AND SCHEMAS
-- ============================================================================

-- Create Supabase system roles
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE CREATEDB PASSWORD 'your-super-secret-and-long-postgres-password';
CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE CREATEDB PASSWORD 'your-super-secret-and-long-postgres-password';
CREATE ROLE supabase_admin NOLOGIN NOINHERIT CREATEROLE CREATEDB;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'your-super-secret-and-long-postgres-password';

-- Grant role memberships
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO postgres;
GRANT supabase_storage_admin TO postgres;
GRANT supabase_admin TO postgres;

-- Create Supabase schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Grant schema permissions
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, authenticated, anon, service_role;
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin, authenticated, anon, service_role;
GRANT USAGE ON SCHEMA realtime TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA _realtime TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- ============================================================================
-- AUTH SCHEMA TABLES
-- ============================================================================

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamptz
);

CREATE TABLE auth.refresh_tokens (
  id bigserial PRIMARY KEY,
  token text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parent text,
  session_id uuid
);

CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  factor_id uuid,
  aal text,
  not_after timestamptz
);

-- Grant permissions on auth tables
GRANT ALL ON auth.users TO supabase_auth_admin;
GRANT ALL ON auth.refresh_tokens TO supabase_auth_admin;
GRANT ALL ON auth.sessions TO supabase_auth_admin;
GRANT SELECT ON auth.users TO authenticated, service_role;

-- ============================================================================
-- STORAGE SCHEMA TABLES
-- ============================================================================

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false
);

CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  UNIQUE(bucket_id, name)
);

-- Grant permissions on storage tables
GRANT ALL ON storage.buckets TO supabase_storage_admin;
GRANT ALL ON storage.objects TO supabase_storage_admin;
GRANT SELECT ON storage.buckets TO authenticated, anon, service_role;
GRANT SELECT ON storage.objects TO authenticated, anon, service_role;

-- ============================================================================
-- APPLICATION TABLES (from migrations)
-- ============================================================================

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text CHECK (role IN ('student', 'teacher')) NOT NULL DEFAULT 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE INDEX profiles_role_idx ON public.profiles(role);

-- COURSES TABLE
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  format text CHECK (format IN ('lab', 'quiz')) NOT NULL DEFAULT 'lab',
  age_range int4range,
  status text CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  simulation_jsx text,
  interactions_json jsonb,
  companion_config jsonb,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can CRUD own courses" ON public.courses
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can read published courses" ON public.courses
  FOR SELECT USING (status = 'published');

CREATE INDEX courses_teacher_id_idx ON public.courses(teacher_id);
CREATE INDEX courses_status_idx ON public.courses(status);

-- STUDENT_PROGRESS TABLE
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id) NOT NULL,
  course_id uuid REFERENCES public.courses(id) NOT NULL,
  thread_id uuid,
  progress_data jsonb DEFAULT '{}',
  reaction_history text[] DEFAULT '{}',
  last_active timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students own their progress" ON public.student_progress
  FOR ALL USING (auth.uid() = student_id);

CREATE INDEX student_progress_student_id_idx ON public.student_progress(student_id);
CREATE INDEX student_progress_course_id_idx ON public.student_progress(course_id);
CREATE INDEX student_progress_last_active_idx ON public.student_progress(last_active);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_course_updated
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- HELPER FUNCTION: auth.uid()
-- ============================================================================
-- Returns the current authenticated user's ID from JWT

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE sql STABLE;
