"use client";

interface Props {
  title: string;
  columns?: number;
  theme?: string;
  widgetId?: string;
}

export default function ComposeCanvas({ title, columns = 2, theme = "dark" }: Props) {
  const isDark = theme !== "light";
  return (
    <div
      className={`w-full px-4 py-3 rounded-lg ${
        isDark
          ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white"
          : "bg-gradient-to-r from-slate-100 to-white text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2 text-xs opacity-60">
          <span>{columns}-col layout</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
