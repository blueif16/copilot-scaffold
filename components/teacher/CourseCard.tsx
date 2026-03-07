"use client";

interface CourseCardProps {
  title: string;
  format: "lab" | "dialogue";
  status: "draft" | "published";
  lastEdited?: string;
  onEdit?: () => void;
}

export function CourseCard({
  title,
  format,
  status,
  lastEdited,
  onEdit,
}: CourseCardProps) {
  return (
    <div className="border border-ink/20 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-xl font-medium text-ink">{title}</h3>
        <span
          className={`
          px-2.5 py-1 rounded text-xs font-medium
          ${
            format === "lab"
              ? "bg-playful-sky/20 text-playful-sky"
              : "bg-playful-peach/20 text-playful-peach"
          }
        `}
        >
          {format === "lab" ? "Lab Simulation" : "Dialogue"}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-ink/60 mb-4">
        <span
          className={`
          inline-flex items-center gap-1.5
          ${status === "published" ? "text-green-600" : "text-ink/60"}
        `}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === "published" ? "bg-green-600" : "bg-ink/40"
            }`}
          />
          {status === "draft" ? "Draft" : "Published"}
        </span>
        {lastEdited && <span>Edited {lastEdited}</span>}
      </div>

      <button
        onClick={onEdit}
        className="w-full px-4 py-2 border border-ink/20 rounded-lg hover:bg-ink/5 transition-colors text-sm font-medium text-ink"
      >
        Edit Course
      </button>
    </div>
  );
}
