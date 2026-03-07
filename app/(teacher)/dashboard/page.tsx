"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();

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

      {/* Empty state */}
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
    </div>
  );
}
