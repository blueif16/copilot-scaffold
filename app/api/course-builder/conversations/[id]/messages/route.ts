import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST /api/course-builder/conversations/[id]/messages - Save messages to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("course_builder_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Delete existing messages and insert new ones (simple replace strategy)
    const { error: deleteError } = await supabase
      .from("course_builder_messages")
      .delete()
      .eq("conversation_id", id);

    if (deleteError) {
      console.error("[course-builder] Failed to delete old messages:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new messages
    const messagesToInsert = messages.map((msg: any) => ({
      conversation_id: id,
      role: msg.role,
      content: msg.content,
    }));

    const { error: insertError } = await supabase
      .from("course_builder_messages")
      .insert(messagesToInsert);

    if (insertError) {
      console.error("[course-builder] Failed to insert messages:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: updateConversationError } = await supabase
      .from("course_builder_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateConversationError) {
      console.error("[course-builder] Failed to update conversation timestamp:", updateConversationError);
      return NextResponse.json({ error: updateConversationError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[course-builder] POST /conversations/[id]/messages error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
