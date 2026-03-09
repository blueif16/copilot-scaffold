-- Course Builder Conversation Memory Schema
-- Creates tables for LangGraph checkpointing and application-level conversation storage

-- ============================================================================
-- LANGGRAPH CHECKPOINTING TABLES
-- ============================================================================
-- Required by PostgresSaver for persistent conversation state

-- Checkpoints table: stores graph state snapshots
create table if not exists public.checkpoints (
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb not null,
  metadata jsonb not null default '{}',
  created_at timestamptz default now(),
  primary key (thread_id, checkpoint_ns, checkpoint_id)
);

-- Checkpoint writes table: stores pending writes for interrupts/human-in-the-loop
create table if not exists public.checkpoint_writes (
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  task_id text not null,
  idx integer not null,
  channel text not null,
  type text,
  value jsonb,
  primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Indexes for LangGraph checkpoint performance
create index if not exists checkpoints_thread_id_idx on public.checkpoints(thread_id);
create index if not exists checkpoints_created_at_idx on public.checkpoints(created_at);
create index if not exists checkpoint_writes_thread_id_idx on public.checkpoint_writes(thread_id);

-- ============================================================================
-- APPLICATION TABLES
-- ============================================================================
-- User-facing conversation and message storage

-- Course builder conversations table
create table public.course_builder_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  thread_id text not null unique,  -- Links to LangGraph checkpoints
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Course builder messages table
create table public.course_builder_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.course_builder_conversations(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.course_builder_conversations enable row level security;
alter table public.course_builder_messages enable row level security;

-- RLS Policies for conversations
create policy "Users can CRUD own conversations" on public.course_builder_conversations
  for all using (auth.uid() = user_id);

-- RLS Policies for messages
create policy "Users can read messages from own conversations" on public.course_builder_messages
  for select using (
    exists (
      select 1 from public.course_builder_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to own conversations" on public.course_builder_messages
  for insert with check (
    exists (
      select 1 from public.course_builder_conversations
      where id = conversation_id and user_id = auth.uid()
    )
  );

-- Indexes for application table performance
create index course_builder_conversations_user_id_idx on public.course_builder_conversations(user_id);
create index course_builder_conversations_thread_id_idx on public.course_builder_conversations(thread_id);
create index course_builder_conversations_created_at_idx on public.course_builder_conversations(created_at);
create index course_builder_messages_conversation_id_idx on public.course_builder_messages(conversation_id);
create index course_builder_messages_created_at_idx on public.course_builder_messages(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on conversation changes
create trigger on_course_builder_conversation_updated
  before update on public.course_builder_conversations
  for each row execute procedure public.handle_updated_at();
