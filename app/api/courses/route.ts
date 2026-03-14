import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CourseFormat } from "@/lib/types/course-builder";

interface SaveCourseRequest {
  title: string;
  description?: string;
  format: CourseFormat;
  files: Record<string, string>;
  conversationId?: string;
  thumbnail_url?: string;
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
    const { title, description, format, files, conversationId, thumbnail_url } = body;

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

    // Check if course already exists for this conversation
    let course;
    let isUpdate = false;

    if (conversationId) {
      const { data: existingCourse } = await supabase
        .from("courses")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("teacher_id", user.id)
        .single();

      if (existingCourse) {
        // Update existing course
        const { data: updatedCourse, error: updateError } = await supabase
          .from("courses")
          .update({
            title,
            description: description || null,
            format,
            files,
            thumbnail_url: thumbnail_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCourse.id)
          .select()
          .single();

        if (updateError) {
          console.error("[courses] Failed to update course:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        course = updatedCourse;
        isUpdate = true;
      }
    }

    // Insert new course if no existing course found
    if (!course) {
      const { data: newCourse, error: insertError } = await supabase
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
          thumbnail_url: thumbnail_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[courses] Failed to create course:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      course = newCourse;
    }

    return NextResponse.json(
      { success: true, course, isUpdate },
      { status: isUpdate ? 200 : 201 }
    );
  } catch (error: any) {
    console.error("[courses] POST /courses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
