import { createSupabaseServer } from "@/lib/supabase/server";
import CourseBuilder from "@/components/teacher/CourseBuilder";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;

  console.log("[DATA-FLOW] ChatPage: Loading conversation id=", id);

  const supabase = await createSupabaseServer();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log("[DATA-FLOW] ChatPage: Unauthorized, redirecting to /teacher/chat/new");
    redirect("/teacher/chat/new");
  }

  // Fetch conversation
  const { data: conversation, error: convError } = await supabase
    .from("course_builder_conversations")
    .select("id, thread_id, title, user_id, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    console.log("[DATA-FLOW] ChatPage: Conversation not found, id=", id, "error=", convError);
    redirect("/teacher/chat/new");
  }

  console.log("[DATA-FLOW] ChatPage: Found conversation", {
    id: conversation.id,
    threadId: conversation.thread_id,
    title: conversation.title,
  });

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("course_builder_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  console.log("[DATA-FLOW] ChatPage: Messages", {
    count: messages?.length || 0,
    error: msgError?.message,
    sample: messages?.[0] ? {
      id: messages[0].id,
      role: messages[0].role,
      contentLength: messages[0].content?.length || 0,
    } : null,
  });

  // Pass conversation to CourseBuilder
  return (
    <CourseBuilder
      initialConversation={{
        id: conversation.id,
        threadId: conversation.thread_id,
      }}
    />
  );
}
