"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Market {
  id: string;
  title: string;
  yesPrice: number;
  volume: number;
  url: string;
  closesAt: number;
  category: string;
  source: string;
}

interface Props {
  query: string;
  category?: string;
  page_size?: number;
  widgetId?: string;
}

function sourceLabel(s: string): string {
  if (s.includes("POLYMARKET")) return "Polymarket";
  if (s.includes("KALSHI")) return "Kalshi";
  return s.replace("MARKET_SOURCE_", "");
}

export default function PredictionMarkets({ query, category, page_size }: Props) {
  const [data, setData] = useState<{ markets: Market[] } | null>(null);
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

  const markets = data?.markets ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Prediction Markets — &quot;{query}&quot;
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {markets.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No markets found</div>
        )}
        {markets.map((m) => {
          const pct = Math.round(m.yesPrice * 100);
          return (
            <div key={m.id} className="px-3 py-3 hover:bg-muted/50">
              <a
                href={m.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline block mb-2"
              >
                {m.title}
              </a>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-400 w-10 text-right">
                  {pct}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {m.volume > 0 && <span>Vol: ${m.volume.toLocaleString()}</span>}
                <span>{sourceLabel(m.source)}</span>
                {m.category && <span className="bg-muted px-1.5 py-0.5 rounded">{m.category}</span>}
                {m.closesAt > 0 && (
                  <span>Closes: {new Date(m.closesAt * 1000).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
