"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  country_code: string;
  widgetId?: string;
}

export default function CountryStockIndex({ country_code }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/market/v1/get-country-stock-index", { country_code })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const d = data?.data ?? data?.result ?? data ?? {};
  const change = d.change_percent ?? d.changePercent ?? d.change ?? 0;
  const isPositive = Number(change) >= 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Stock Index — {country_code}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-sm text-muted-foreground mb-1">
          {d.name ?? d.index_name ?? d.symbol ?? country_code}
        </div>
        <div className="text-4xl font-bold mb-2">
          {d.price != null ? Number(d.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : d.value ?? "—"}
        </div>
        <div className={`text-lg font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{typeof change === "number" ? change.toFixed(2) : change}%
        </div>
        {d.last_updated && (
          <div className="text-xs text-muted-foreground mt-3">
            Updated: {new Date(d.last_updated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
