"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

interface CourseBuilderHistoryItem {
  id: string;
  title: string | null;
  updated_at: string;
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [builderConversations, setBuilderConversations] = useState<CourseBuilderHistoryItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && profile?.role !== "teacher") {
      router.replace("/");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createSupabaseBrowser();

    const loadBuilderConversations = async () => {
      const { data, error } = await supabase
        .from("course_builder_conversations")
        .select("id, title, updated_at")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Failed to fetch course builder conversations:", error);
        return;
      }

      setBuilderConversations(data || []);
    };

    const handleConversationCreated = (event: Event) => {
      const detail = (event as CustomEvent<CourseBuilderHistoryItem>).detail;
      if (!detail) return;

      setBuilderConversations((prev) => {
        const next = prev.filter((conversation) => conversation.id !== detail.id);
        return [detail, ...next];
      });
    };

    const handleConversationMutated = () => {
      void loadBuilderConversations();
    };

    void loadBuilderConversations();

    window.addEventListener("course-builder:conversation-created", handleConversationCreated as EventListener);
    window.addEventListener("course-builder:conversation-updated", handleConversationMutated);
    window.addEventListener("course-builder:conversation-deleted", handleConversationMutated);

    return () => {
      window.removeEventListener("course-builder:conversation-created", handleConversationCreated as EventListener);
      window.removeEventListener("course-builder:conversation-updated", handleConversationMutated);
      window.removeEventListener("course-builder:conversation-deleted", handleConversationMutated);
    };
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper">
        <div className="text-ink/40 font-body text-sm">加载中...</div>
      </div>
    );
  }

  if (profile?.role !== "teacher") return null;

  const isCoursesPage = pathname === "/teacher/courses";

  return (
    <div className="h-screen flex bg-paper overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col border-r border-ink/[0.06] bg-paper overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? 56 : 260 }}
      >
        {/* Top section */}
        <div className={`pt-4 pb-2 ${collapsed ? "px-1.5" : "px-4"}`}>
          {/* Logo row */}
          <div className={`flex items-center mb-4 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && (
              <Link
                href="/teacher/chat/new"
                className="font-display text-[17px] font-semibold text-ink tracking-[-0.01em] hover:opacity-80 transition-opacity"
              >
                Omniscience
              </Link>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-ink/25 hover:text-ink/50 hover:bg-ink/[0.04] transition-colors shrink-0"
              title={collapsed ? "展开侧栏" : "收起侧栏"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          {/* New course */}
          <Link
            href="/teacher/chat/new"
            className={`flex items-center rounded-lg text-ink/60 hover:text-ink hover:bg-ink/[0.04] transition-colors font-body text-[13.5px] ${
              collapsed ? "justify-center w-full py-2" : "gap-2.5 w-full px-3 py-2"
            }`}
            title="新建课程"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {!collapsed && <span>新建课程</span>}
          </Link>

          {/* Search */}
          <button
            className={`flex items-center rounded-lg text-ink/40 hover:text-ink/60 hover:bg-ink/[0.04] transition-colors font-body text-[13.5px] ${
              collapsed ? "justify-center w-full py-2" : "gap-2.5 w-full px-3 py-2"
            }`}
            title="搜索"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {!collapsed && <span>搜索</span>}
          </button>
        </div>

        {/* Nav */}
        <div className={collapsed ? "px-1.5 py-1" : "px-3 py-1"}>
          <Link
            href="/teacher/courses"
            className={`flex items-center rounded-lg font-body text-[13.5px] transition-colors ${
              isCoursesPage ? "text-ink bg-ink/[0.06]" : "text-ink/50 hover:text-ink/70 hover:bg-ink/[0.03]"
            } ${collapsed ? "justify-center py-2" : "gap-2.5 px-3 py-2"}`}
            title="我的课程"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {!collapsed && <span>我的课程</span>}
          </Link>
        </div>

        {/* Divider + History (hidden when collapsed) */}
        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col">
            {builderConversations.length > 0 && (
              <>
                <div className="mx-4 my-2 border-t border-ink/[0.06]" />
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1">
                  <div>
                    <div className="px-3 py-1.5 text-[11px] font-body text-ink/35 uppercase tracking-wider">
                      历史对话
                    </div>
                    <div className="space-y-0.5">
                      {builderConversations.map((conversation) => {
                        const href = `/teacher/chat/${conversation.id}`;

                        return (
                          <Link
                            key={conversation.id}
                            href={href}
                            className={`block w-full text-left px-3 py-2 rounded-lg text-[13px] font-body transition-colors truncate leading-snug ${
                              pathname === href
                                ? "text-ink bg-ink/[0.06]"
                                : "text-ink/55 hover:text-ink/80 hover:bg-ink/[0.03]"
                            }`}
                            title={conversation.title || "未命名对话"}
                          >
                            {conversation.title || "未命名对话"}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Spacer when collapsed (pushes profile to bottom) */}
        {collapsed && <div className="flex-1" />}

        {/* User profile */}
        <div className={`shrink-0 border-t border-ink/[0.06] py-3 ${collapsed ? "px-1.5" : "px-3"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/teacher/courses"
                className="w-9 h-9 rounded-full bg-ink/[0.08] flex items-center justify-center text-[12px] font-bold text-ink/50 hover:bg-ink/[0.12] transition-colors"
                title={profile?.display_name || "教师"}
              >
                {(profile?.display_name || "T").charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={() => signOut()}
                className="w-8 h-8 flex items-center justify-center rounded-md text-ink/25 hover:text-ink/50 hover:bg-ink/[0.04] transition-colors"
                title="退出登录"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-full bg-ink/[0.08] flex items-center justify-center text-[12px] font-bold text-ink/50 shrink-0">
                {(profile?.display_name || "T").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-body font-medium text-ink truncate">
                  {profile?.display_name || "教师"}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="w-7 h-7 flex items-center justify-center rounded-md text-ink/25 hover:text-ink/50 hover:bg-ink/[0.04] transition-colors shrink-0"
                title="退出登录"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
