"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  widgetId?: string;
}

export default function IranEvents(_props: Props) {
  const [data, setData] = useState<any>(null);
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

  const events = Array.isArray(data) ? data : data?.results ?? data?.data ?? data?.events ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Iran Events Timeline
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {events.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No events found</div>
        )}
        {events.map((e: any, i: number) => (
          <div key={i} className="px-3 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {e.event_date ?? e.date ?? "—"}
              </span>
              {(e.event_type ?? e.type) && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  {e.event_type ?? e.type}
                </span>
              )}
            </div>
            <p className="text-sm">
              {e.notes ?? e.description ?? e.title ?? e.location ?? "No details"}
            </p>
            {e.fatalities != null && e.fatalities > 0 && (
              <span className="text-xs text-red-400 mt-1 inline-block">
                {e.fatalities} fatalities
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
