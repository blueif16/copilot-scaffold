"use client";

interface Topic {
  name: string;
  progress: number;
  status: "completed" | "in_progress" | "locked";
}

interface TopicProgressProps {
  topics: Topic[];
  widgetId: string;
}

export default function TopicProgress({ topics }: TopicProgressProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Topic Progress</h3>
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>
                {topic.status === "locked" ? "🔒" : "📖"} {topic.name}
              </span>
              <span className="text-muted-foreground">
                {topic.status === "locked"
                  ? "Locked"
                  : `${Math.round(topic.progress * 100)}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  topic.status === "locked"
                    ? "bg-muted-foreground/20"
                    : topic.status === "completed"
                    ? "bg-green-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${topic.progress * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
