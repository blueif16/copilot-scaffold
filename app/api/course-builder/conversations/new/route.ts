import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST /api/course-builder/conversations/new - Start a fresh session without reusing an old thread
export async function POST() {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ thread_id: crypto.randomUUID() }, { status: 201 });
  } catch (error: any) {
    console.error("[course-builder] POST /conversations/new error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
