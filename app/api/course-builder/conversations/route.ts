import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET /api/course-builder/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch conversations ordered by updated_at desc
    const { data: conversations, error } = await supabase
      .from("course_builder_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[course-builder] Failed to fetch conversations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("[course-builder] GET /conversations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/course-builder/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { thread_id, title } = body;

    if (!thread_id) {
      return NextResponse.json({ error: "thread_id is required" }, { status: 400 });
    }

    const { data: existingConversation, error: existingError } = await supabase
      .from("course_builder_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("thread_id", thread_id)
      .maybeSingle();

    if (existingError) {
      console.error("[course-builder] Failed to check for existing conversation:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation });
    }

    // Create conversation
    const { data: conversation, error } = await supabase
      .from("course_builder_conversations")
      .insert({
        user_id: user.id,
        thread_id,
        title: title || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: racedConversation, error: raceLookupError } = await supabase
          .from("course_builder_conversations")
          .select("*")
          .eq("user_id", user.id)
          .eq("thread_id", thread_id)
          .maybeSingle();

        if (raceLookupError) {
          console.error("[course-builder] Failed to load conversation after unique conflict:", raceLookupError);
          return NextResponse.json({ error: raceLookupError.message }, { status: 500 });
        }

        if (racedConversation) {
          return NextResponse.json({ conversation: racedConversation });
        }
      }

      console.error("[course-builder] Failed to create conversation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: any) {
    console.error("[course-builder] POST /conversations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
