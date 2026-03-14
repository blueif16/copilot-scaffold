import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

interface UploadThumbnailRequest {
  image: string; // data URL format: data:image/jpeg;base64,/9j/4AAQ...
}

// POST /api/courses/thumbnail - Upload course thumbnail
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

    const body: UploadThumbnailRequest = await request.json();
    const { image } = body;

    // Validate image data
    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image data. Expected data URL format." },
        { status: 400 }
      );
    }

    // Extract MIME type and base64 data
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid data URL format" },
        { status: 400 }
      );
    }

    const [, extension, base64Data] = matches;

    // Validate MIME type
    const allowedTypes = ["jpeg", "jpg", "png", "webp"];
    if (!allowedTypes.includes(extension.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid image type. Allowed: jpeg, png, webp" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${user.id}_${timestamp}.${extension}`;

    console.log("[thumbnail] Uploading with authenticated client, user:", user.id, "filename:", filename);

    // Upload to Supabase Storage using the authenticated client
    // The RLS policy allows authenticated users to insert into course-thumbnails bucket
    const { error: uploadError } = await supabase.storage
      .from("course-thumbnails")
      .upload(filename, buffer, {
        contentType: `image/${extension}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("[thumbnail] Upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image", details: uploadError.message },
        { status: 500 }
      );
    }

    console.log("[thumbnail] Upload successful, getting public URL");

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("course-thumbnails")
      .getPublicUrl(filename);

    console.log("[thumbnail] Public URL:", publicUrl);

    return NextResponse.json({ url: publicUrl }, { status: 200 });

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error: any) {
    console.error("[thumbnail] POST /courses/thumbnail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
