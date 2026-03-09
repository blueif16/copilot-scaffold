#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=postgres_password="$POSTGRES_PASSWORD" <<'EOSQL'
-- Supabase initialization script.
-- This runs only on first database startup via docker-entrypoint-initdb.d.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SUPABASE ROLES AND SCHEMAS
-- ============================================================================

CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE CREATEDB PASSWORD :'postgres_password';
CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE CREATEDB PASSWORD :'postgres_password';
CREATE ROLE supabase_admin LOGIN NOINHERIT CREATEROLE CREATEDB PASSWORD :'postgres_password';
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD :'postgres_password';

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO postgres;
GRANT supabase_storage_admin TO postgres;
GRANT supabase_admin TO postgres;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;

ALTER SCHEMA auth OWNER TO supabase_auth_admin;
ALTER SCHEMA storage OWNER TO supabase_storage_admin;
ALTER SCHEMA realtime OWNER TO supabase_admin;
ALTER SCHEMA _realtime OWNER TO supabase_admin;

GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA realtime TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role;
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

ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;
ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;
ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT SELECT ON auth.users TO authenticated, service_role;

-- The Storage API expects the base tables to exist before it applies the
-- later tenant migrations that add derived columns and flags.
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
  UNIQUE(bucket_id, name)
);

ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;
ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin;
GRANT SELECT ON storage.buckets TO authenticated, anon, service_role;
GRANT SELECT ON storage.objects TO authenticated, anon, service_role;

-- ============================================================================
-- APPLICATION TABLES
-- ============================================================================

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
-- COURSE BUILDER + LANGGRAPH TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.checkpoint_migrations (
  v integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.checkpoints (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT '',
  checkpoint_id text NOT NULL,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS public.checkpoint_blobs (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT '',
  channel text NOT NULL,
  version text NOT NULL,
  type text NOT NULL,
  blob bytea,
  PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS public.checkpoint_writes (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT '',
  checkpoint_id text NOT NULL,
  task_id text NOT NULL,
  idx integer NOT NULL,
  channel text NOT NULL,
  type text,
  blob bytea NOT NULL,
  task_path text NOT NULL DEFAULT '',
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx ON public.checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_blobs_thread_id_idx ON public.checkpoint_blobs(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_writes_thread_id_idx ON public.checkpoint_writes(thread_id);

INSERT INTO public.checkpoint_migrations (v) VALUES (9) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.course_builder_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  thread_id text NOT NULL UNIQUE,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_builder_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.course_builder_conversations(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_builder_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_builder_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_builder_conversations TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.course_builder_messages TO authenticated, service_role;

CREATE POLICY "Users can CRUD own conversations" ON public.course_builder_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read messages from own conversations" ON public.course_builder_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_builder_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations" ON public.course_builder_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_builder_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own conversations" ON public.course_builder_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.course_builder_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS course_builder_conversations_user_id_idx ON public.course_builder_conversations(user_id);
CREATE INDEX IF NOT EXISTS course_builder_conversations_thread_id_idx ON public.course_builder_conversations(thread_id);
CREATE INDEX IF NOT EXISTS course_builder_conversations_created_at_idx ON public.course_builder_conversations(created_at);
CREATE INDEX IF NOT EXISTS course_builder_messages_conversation_id_idx ON public.course_builder_messages(conversation_id);
CREATE INDEX IF NOT EXISTS course_builder_messages_created_at_idx ON public.course_builder_messages(created_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

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

CREATE TRIGGER on_course_builder_conversation_updated
  BEFORE UPDATE ON public.course_builder_conversations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- HELPER FUNCTION: auth.uid()
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE sql STABLE;
EOSQL
