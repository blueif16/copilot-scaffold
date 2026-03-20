"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  query: string;
  category?: string;
  page_size?: number;
  widgetId?: string;
}

export default function PredictionMarkets({ query, category, page_size }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/prediction/v1/list-prediction-markets", { query, category, page_size })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const markets = Array.isArray(data) ? data : data?.results ?? data?.data ?? data?.markets ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Prediction Markets — &quot;{query}&quot;
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {markets.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No markets found</div>
        )}
        {markets.map((m: any, i: number) => {
          const prob = m.probability ?? m.yes_price ?? m.outcomePrices?.[0] ?? null;
          const pct = prob != null ? (prob > 1 ? prob : Math.round(prob * 100)) : null;
          return (
            <div key={i} className="px-3 py-3 hover:bg-muted/50">
              <p className="text-sm font-medium mb-2">{m.question ?? m.title ?? m.name ?? "—"}</p>
              {pct != null && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-emerald-400 w-10 text-right">
                    {pct}%
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {m.volume != null && <span>Vol: ${Number(m.volume).toLocaleString()}</span>}
                {m.platform && <span>{m.platform}</span>}
                {m.category && <span className="bg-muted px-1.5 py-0.5 rounded">{m.category}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
