import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CourseFormat } from "@/lib/types/course-builder";

interface SaveCourseRequest {
  title: string;
  description?: string;
  format: CourseFormat;
  files: Record<string, string>;
  conversationId?: string;
}

// POST /api/courses - Save a new course
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SaveCourseRequest = await request.json();
    const { title, description, format, files, conversationId } = body;

    // Validate required fields
    if (!title || !format || !files) {
      return NextResponse.json(
        { error: "title, format, and files are required" },
        { status: 400 }
      );
    }

    // Validate files object is not empty
    if (Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: "files object cannot be empty" },
        { status: 400 }
      );
    }

    // Validate format
    if (!["lab", "quiz", "dialogue"].includes(format)) {
      return NextResponse.json(
        { error: "format must be one of: lab, quiz, dialogue" },
        { status: 400 }
      );
    }

    // Insert course into database
    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        teacher_id: user.id,
        title,
        description: description || null,
        format,
        files,
        status: "saved",
        related_topics: [],
        conversation_id: conversationId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[courses] Failed to create course:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (error: any) {
    console.error("[courses] POST /courses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
