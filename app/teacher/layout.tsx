"use client";

import { useAuth } from "@/contexts/AuthContext";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role !== "teacher") {
      router.replace("/");
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (profile?.role !== "teacher") {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        <aside className="w-64 border-r border-ink/10 min-h-screen p-6 bg-white/50">
          <div className="mb-8">
            <h2 className="font-display text-xl font-medium text-ink">
              Omniscience
            </h2>
            <p className="text-xs text-ink/50 mt-1">Teacher Portal</p>
          </div>
          <TeacherNav />
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
