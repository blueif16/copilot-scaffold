"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  keyword?: string;
  widgetId?: string;
}

export default function Forecasts({ keyword }: Props) {
  const [data, setData] = useState<{ data: Record<string, any> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/bootstrap", { keys: "forecasts" })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  let items: any[] = [];
  const forecasts = data?.data?.forecasts;
  if (Array.isArray(forecasts)) {
    items = forecasts;
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    items = items.filter((f: any) =>
      (f.title ?? f.question ?? "").toLowerCase().includes(kw) ||
      (f.analysis ?? f.description ?? f.text ?? "").toLowerCase().includes(kw)
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Forecasts {keyword ? `— "${keyword}"` : ""}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No forecasts found</div>
        )}
        {items.map((f: any, i: number) => {
          const prob = f.probability ?? f.confidence ?? null;
          const pct = prob != null ? (prob > 1 ? prob : Math.round(prob * 100)) : null;
          return (
            <div key={i} className="px-3 py-3 hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium">{f.title ?? f.question ?? "—"}</p>
                {pct != null && (
                  <span className="text-xs font-mono font-semibold text-blue-400 whitespace-nowrap">
                    {pct}%
                  </span>
                )}
              </div>
              {(f.analysis ?? f.description ?? f.text) && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {f.analysis ?? f.description ?? f.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
