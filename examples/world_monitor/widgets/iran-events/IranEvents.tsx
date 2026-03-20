"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface IranEvent {
  id: string;
  title: string;
  category: string;
  sourceUrl: string;
  locationName: string;
  timestamp: string;
  severity: string;
}

interface Props {
  widgetId?: string;
}

function severityColor(s: string): string {
  const l = (s ?? "").toLowerCase();
  if (l.includes("critical") || l.includes("high")) return "bg-red-500/20 text-red-400";
  if (l.includes("medium") || l.includes("moderate")) return "bg-orange-500/20 text-orange-400";
  return "bg-amber-500/20 text-amber-400";
}

export default function IranEvents(_props: Props) {
  const [data, setData] = useState<{ events: IranEvent[]; scrapedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/conflict/v1/list-iran-events")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const events = data?.events ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
        <span>Iran Events Timeline</span>
        {data?.scrapedAt && (
          <span className="text-[10px] opacity-60">
            {new Date(data.scrapedAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {events.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No events found</div>
        )}
        {events.map((e) => (
          <div key={e.id} className="px-3 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(e.timestamp).toLocaleDateString()}
              </span>
              {e.category && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                  {e.category}
                </span>
              )}
              {e.severity && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${severityColor(e.severity)}`}>
                  {e.severity}
                </span>
              )}
            </div>
            <a
              href={e.sourceUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {e.title}
            </a>
            {e.locationName && (
              <div className="text-xs text-muted-foreground mt-1">{e.locationName}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
