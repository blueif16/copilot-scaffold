"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface StockData {
  available: boolean;
  code: string;
  symbol: string;
  indexName: string;
  price: number;
  weekChangePercent: number;
  currency: string;
  fetchedAt: string;
}

interface Props {
  country_code: string;
  widgetId?: string;
}

export default function CountryStockIndex({ country_code }: Props) {
  const [data, setData] = useState<StockData | null>(null);
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
  if (!data?.available) return <div className="p-4 text-muted-foreground text-sm">No stock index data for {country_code}</div>;

  const isPositive = data.weekChangePercent >= 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Stock Index — {country_code}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-sm text-muted-foreground mb-1">
          {data.indexName} ({data.symbol})
        </div>
        <div className="text-4xl font-bold mb-2">
          {data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="text-sm font-normal text-muted-foreground ml-1">{data.currency}</span>
        </div>
        <div className={`text-lg font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{data.weekChangePercent.toFixed(2)}% this week
        </div>
        {data.fetchedAt && (
          <div className="text-xs text-muted-foreground mt-3">
            Updated: {new Date(data.fetchedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
