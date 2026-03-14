import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

interface CaptureScreenshotRequest {
  html: string; // The HTML content to render and capture
  width?: number;
  height?: number;
}

// POST /api/courses/screenshot - Capture screenshot of HTML content using Playwright
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden: Teachers only" }, { status: 403 });
    }

    const body: CaptureScreenshotRequest = await request.json();
    const { html, width = 800, height = 600 } = body;

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    // TODO: Implement Playwright screenshot capture
    // For now, return a placeholder error
    return NextResponse.json(
      {
        error: "Screenshot capture not yet implemented. Need to add Playwright to backend.",
        suggestion: "Alternative: Capture code editor view instead of preview, or use external screenshot service"
      },
      { status: 501 }
    );

  } catch (error: any) {
    console.error("[screenshot] POST /courses/screenshot error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
