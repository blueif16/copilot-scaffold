-- Course Builder Conversation Memory Schema
-- Creates tables for LangGraph checkpointing and application-level conversation storage

-- ============================================================================
-- LANGGRAPH CHECKPOINTING TABLES
-- ============================================================================
-- Required by AsyncPostgresSaver for persistent conversation state
-- Schema matches LangGraph's built-in migrations

-- Migration tracking table
create table if not exists public.checkpoint_migrations (
  v integer primary key
);

-- Checkpoints table: stores graph state snapshots
create table if not exists public.checkpoints (
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb not null,
  metadata jsonb not null default '{}',
  primary key (thread_id, checkpoint_ns, checkpoint_id)
);

-- Checkpoint blobs table: stores large binary data separately
create table if not exists public.checkpoint_blobs (
  thread_id text not null,
  checkpoint_ns text not null default '',
  channel text not null,
  version text not null,
  type text not null,
  blob bytea,
  primary key (thread_id, checkpoint_ns, channel, version)
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
  blob bytea not null,
  task_path text not null default '',
  primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Indexes for LangGraph checkpoint performance
create index if not exists checkpoints_thread_id_idx on public.checkpoints(thread_id);
create index if not exists checkpoint_blobs_thread_id_idx on public.checkpoint_blobs(thread_id);
create index if not exists checkpoint_writes_thread_id_idx on public.checkpoint_writes(thread_id);

-- Mark as migrated to version 9 (latest LangGraph migration)
insert into public.checkpoint_migrations (v) values (9) on conflict do nothing;

-- ============================================================================
-- APPLICATION TABLES
-- ============================================================================
-- User-facing conversation and message storage

-- Course builder conversations table
create table if not exists public.course_builder_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  thread_id text not null unique,  -- Links to LangGraph checkpoints
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Course builder messages table
create table if not exists public.course_builder_messages (
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
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_builder_conversations'
      and policyname = 'Users can CRUD own conversations'
  ) then
    create policy "Users can CRUD own conversations" on public.course_builder_conversations
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- RLS Policies for messages
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_builder_messages'
      and policyname = 'Users can read messages from own conversations'
  ) then
    create policy "Users can read messages from own conversations" on public.course_builder_messages
      for select using (
        exists (
          select 1 from public.course_builder_conversations
          where id = conversation_id and user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_builder_messages'
      and policyname = 'Users can insert messages to own conversations'
  ) then
    create policy "Users can insert messages to own conversations" on public.course_builder_messages
      for insert with check (
        exists (
          select 1 from public.course_builder_conversations
          where id = conversation_id and user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_builder_messages'
      and policyname = 'Users can delete messages from own conversations'
  ) then
    create policy "Users can delete messages from own conversations" on public.course_builder_messages
      for delete using (
        exists (
          select 1 from public.course_builder_conversations
          where id = conversation_id and user_id = auth.uid()
        )
      );
  end if;
end $$;

grant select, insert, update, delete on table public.course_builder_conversations to authenticated, service_role;
grant select, insert, delete on table public.course_builder_messages to authenticated, service_role;

-- Indexes for application table performance
create index if not exists course_builder_conversations_user_id_idx on public.course_builder_conversations(user_id);
create index if not exists course_builder_conversations_thread_id_idx on public.course_builder_conversations(thread_id);
create index if not exists course_builder_conversations_created_at_idx on public.course_builder_conversations(created_at);
create index if not exists course_builder_messages_conversation_id_idx on public.course_builder_messages(conversation_id);
create index if not exists course_builder_messages_created_at_idx on public.course_builder_messages(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on conversation changes
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_course_builder_conversation_updated'
      and tgrelid = 'public.course_builder_conversations'::regclass
  ) then
    create trigger on_course_builder_conversation_updated
      before update on public.course_builder_conversations
      for each row execute procedure public.handle_updated_at();
  end if;
end $$;
