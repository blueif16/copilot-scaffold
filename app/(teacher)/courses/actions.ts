"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SaveDraftInput {
  title: string;
  description?: string;
  format: "lab" | "quiz";
  simulation_jsx?: string;
  interactions_json?: any;
  companion_config?: any;
}

export async function saveDraft(input: SaveDraftInput) {
  const supabase = await createSupabaseServer();

  // Validate teacher session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify user is a teacher
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "teacher") {
    return { success: false, error: "Only teachers can create courses" };
  }

  // Insert course with status='draft'
  const { data, error } = await supabase
    .from("courses")
    .insert([
      {
        teacher_id: user.id,
        title: input.title,
        description: input.description,
        format: input.format,
        simulation_jsx: input.simulation_jsx,
        interactions_json: input.interactions_json,
        companion_config: input.companion_config,
        status: "draft",
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/courses");
  return { success: true, data };
}
