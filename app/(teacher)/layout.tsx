"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-paper">
        {/* Teacher sidebar nav will be added in future slices */}
        <div className="flex">
          <aside className="w-64 border-r border-ink/20 min-h-screen p-6">
            <h2 className="font-display text-xl font-medium text-ink mb-6">
              Teacher Dashboard
            </h2>
            <nav className="space-y-2">
              <a
                href="/teacher/dashboard"
                className="block px-4 py-2 rounded-lg hover:bg-ink/5 transition-colors"
              >
                My Courses
              </a>
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
