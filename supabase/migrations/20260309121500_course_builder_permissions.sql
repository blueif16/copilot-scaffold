-- Grant runtime access to course-builder tables and allow message replacement.

grant select, insert, update, delete on table public.course_builder_conversations to authenticated, service_role;
grant select, insert, delete on table public.course_builder_messages to authenticated, service_role;

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
