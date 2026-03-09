import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET /api/course-builder/conversations/[id] - Load conversation with messages
export async function GET(
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

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from("course_builder_conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from("course_builder_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("[course-builder] Failed to fetch messages:", msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({ conversation, messages });
  } catch (error: any) {
    console.error("[course-builder] GET /conversations/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/course-builder/conversations/[id] - Delete conversation
export async function DELETE(
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

    // Delete conversation (messages cascade delete via ON DELETE CASCADE)
    const { error } = await supabase
      .from("course_builder_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[course-builder] Failed to delete conversation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[course-builder] DELETE /conversations/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
