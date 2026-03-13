"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Course {
  id: string;
  title: string;
  description?: string;
  format: "lab" | "quiz" | "dialogue";
  status: "draft" | "published";
  simulation_jsx?: string;
  created_at: string;
  updated_at?: string;
}

type Tab = "all" | "draft" | "published";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

const FORMAT_LABELS: Record<string, string> = {
  lab: "实验模拟",
  quiz: "练习测验",
  dialogue: "对话故事",
};

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!profile?.id) return;
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, description, format, status, simulation_jsx, created_at, updated_at"
        )
        .eq("teacher_id", profile.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch courses:", error);
      } else {
        setCourses(data || []);
      }
      setLoading(false);
    };
    fetchCourses();
  }, [profile?.id]);

  const filtered =
    tab === "all" ? courses : courses.filter((c) => c.status === tab);

  // ── Loading skeleton ──────────────────────────────────

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 pt-10 pb-12">
          <div className="flex items-start justify-between mb-8">
            <div className="h-10 w-40 bg-ink/[0.06] rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-ink/[0.06] rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-ink/[0.04] rounded-xl mb-3" />
                <div className="h-4 w-3/4 bg-ink/[0.06] rounded mb-2" />
                <div className="h-3 w-1/2 bg-ink/[0.04] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 pt-10 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="font-display text-[32px] font-semibold text-ink tracking-[-0.02em]">
            我的课程
          </h1>
          <button
            onClick={() => router.push("/teacher/chat/new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-full hover:bg-ink/90 active:scale-[0.98] transition-all font-body text-[13.5px] font-medium shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            新建课程
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-ink/[0.08] mb-8">
          {(
            [
              ["all", "全部"],
              ["draft", "草稿"],
              ["published", "已发布"],
            ] as [Tab, string][]
          ).map(([key, label]) => {
            const isActive = tab === key;
            const count =
              key === "all"
                ? courses.length
                : courses.filter((c) => c.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-3 font-body text-[14px] transition-colors ${
                  isActive
                    ? "text-ink font-medium"
                    : "text-ink/40 hover:text-ink/60"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1.5 text-[12px] text-ink/30">
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-ink rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-ink/[0.04] flex items-center justify-center mb-5">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink/30"
              >
                <path d="M12 4v8.5L6 22a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3l-6-9.5V4" />
                <path d="M10 4h12" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-medium text-ink mb-1.5">
              {tab === "all"
                ? "还没有课程"
                : tab === "draft"
                ? "没有草稿"
                : "没有已发布的课程"}
            </h2>
            <p className="font-body text-[14px] text-ink/40 mb-6 text-center max-w-sm">
              点击上方「新建课程」开始创建你的第一个互动课程
            </p>
            <button
              onClick={() => router.push("/teacher/chat/new")}
              className="px-5 py-2.5 bg-ink text-white rounded-full hover:bg-ink/90 transition-colors font-body text-[13.5px] font-medium"
            >
              新建课程
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((course) => (
              <button
                key={course.id}
                onClick={() => router.push(`/teacher/courses/${course.id}`)}
                className="group text-left"
              >
                {/* Preview card */}
                <div className="aspect-[4/3] rounded-xl border border-ink/[0.08] bg-white overflow-hidden mb-3 transition-shadow group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] group-hover:border-ink/[0.14]">
                  {course.simulation_jsx ? (
                    <div className="h-full p-4 overflow-hidden">
                      {/* Code preview snippet */}
                      <div className="rounded-lg border border-ink/[0.06] bg-ink/[0.02] p-3 h-full overflow-hidden">
                        <div className="font-mono text-[10px] leading-[1.5] text-ink/50 whitespace-pre-wrap break-all">
                          {course.simulation_jsx.slice(0, 400)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-ink/15">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        >
                          <rect
                            x="4"
                            y="4"
                            width="24"
                            height="24"
                            rx="3"
                          />
                          <path d="M4 12h24" />
                          <circle cx="8" cy="8" r="1" fill="currentColor" />
                          <circle cx="12" cy="8" r="1" fill="currentColor" />
                          <circle cx="16" cy="8" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="px-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-body text-[14px] font-medium text-ink truncate flex-1 group-hover:text-ink/80 transition-colors">
                      {course.title}
                    </h3>
                    {course.status === "draft" && (
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-body text-ink/35 bg-ink/[0.04] rounded">
                        草稿
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] font-body text-ink/35">
                    <span>{FORMAT_LABELS[course.format] || course.format}</span>
                    <span className="text-ink/15">·</span>
                    <span>
                      {timeAgo(course.updated_at || course.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
