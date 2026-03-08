export const dynamic = 'force-dynamic';

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Course {
  id: string;
  title: string;
  description?: string;
  format: "lab" | "quiz";
  status: "draft" | "published";
  created_at: string;
}

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!profile?.id) return;

      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, format, status, created_at")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch courses:", error);
      } else {
        setCourses(data || []);
      }

      setLoading(false);
    };

    fetchCourses();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-medium text-ink mb-2">
            My Courses
          </h1>
          <p className="text-ink/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-medium text-ink mb-2">
          My Courses
        </h1>
        <p className="text-ink/60">
          Welcome back, {profile?.display_name || "Teacher"}
        </p>
      </div>

      {/* Course list or empty state */}
      {courses.length === 0 ? (
        <div className="border border-ink/10 rounded-lg shadow-sm p-12 text-center bg-white/50">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-ink/5 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-ink/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-medium text-ink mb-2">
              No courses yet
            </h2>
            <p className="text-ink/60 mb-6">
              Create your first course to get started with teaching on Omniscience.
            </p>
            <button
              onClick={() => router.push("/teacher/courses/new")}
              className="px-6 py-3 bg-ink text-paper rounded-lg hover:bg-ink/90 transition-colors font-medium shadow-sm"
            >
              Create New Course
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => router.push("/teacher/courses/new")}
              className="px-4 py-2 bg-ink text-paper rounded-lg hover:bg-ink/90 transition-colors font-medium shadow-sm"
            >
              Create New Course
            </button>
          </div>
          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="border border-ink/10 rounded-lg shadow-sm p-6 bg-white/50 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/teacher/courses/${course.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-xl font-medium text-ink">
                        {course.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          course.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {course.status}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-ink/5 text-ink/60">
                        {course.format}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-ink/60 text-sm mb-2">
                        {course.description}
                      </p>
                    )}
                    <p className="text-ink/40 text-xs">
                      Created {new Date(course.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
