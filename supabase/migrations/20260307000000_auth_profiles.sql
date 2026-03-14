-- Slice 8: Auth + Profiles Database Schema
-- Creates profiles, courses, and student_progress tables with RLS policies

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with role and profile information

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('student', 'teacher')) not null default 'student',
  display_name text,
  avatar_url text,
  letta_agent_id text,          -- Letta agent ID for this student's memory (Slice 12)
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Index for performance
create index profiles_role_idx on public.profiles(role);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
-- Teacher-created courses (for Slice 9+)

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  format text check (format in ('lab', 'quiz', 'dialogue')) not null default 'lab',
  related_topics text[] default '{}',  -- List of related topic IDs or keywords
  status text check (status in ('saved', 'pending-review', 'published')) default 'saved',
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.courses enable row level security;

-- RLS Policies for courses
create policy "Teachers can CRUD own courses" on public.courses
  for all using (auth.uid() = teacher_id);

create policy "Students can read published courses" on public.courses
  for select using (status = 'published');

-- Indexes for performance
create index courses_teacher_id_idx on public.courses(teacher_id);
create index courses_status_idx on public.courses(status);

-- ============================================================================
-- STUDENT_PROGRESS TABLE
-- ============================================================================
-- Per-student course progress tracking (for Slice 9+)

create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) not null,
  course_id uuid references public.courses(id) not null,
  thread_id uuid,                    -- CopilotKit session (for built-in topics)
  progress_data jsonb default '{}',
  reaction_history text[] default '{}',
  last_active timestamptz default now(),
  unique(student_id, course_id)
);

-- Enable Row Level Security
alter table public.student_progress enable row level security;

-- RLS Policies for student_progress
create policy "Students own their progress" on public.student_progress
  for all using (auth.uid() = student_id);

-- Indexes for performance
create index student_progress_student_id_idx on public.student_progress(student_id);
create index student_progress_course_id_idx on public.student_progress(course_id);
create index student_progress_last_active_idx on public.student_progress(last_active);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
-- Trigger to automatically create profile on user signup

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for courses.updated_at
create trigger on_course_updated
  before update on public.courses
  for each row execute procedure public.handle_updated_at();
