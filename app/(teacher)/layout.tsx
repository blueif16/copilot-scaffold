"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { TeacherNav } from "@/components/teacher/TeacherNav";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
