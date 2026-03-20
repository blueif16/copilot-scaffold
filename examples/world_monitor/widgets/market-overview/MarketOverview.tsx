"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  keys: string;
  widgetId?: string;
}

function QuoteRow({ item }: { item: any }) {
  const name = item.name ?? item.symbol ?? item.ticker ?? "—";
  const price = item.price ?? item.value ?? item.last ?? null;
  const change = item.changePercent ?? item.change_percent ?? item.weekChangePercent ?? item.change ?? 0;
  const isPositive = Number(change) >= 0;
  return (
    <tr className="hover:bg-muted/50">
      <td className="px-3 py-1.5 text-sm">{name}</td>
      <td className="px-3 py-1.5 text-sm text-right font-mono">
        {price != null ? Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
      </td>
      <td className={`px-3 py-1.5 text-sm text-right font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "+" : ""}{typeof change === "number" ? change.toFixed(2) : change}%
      </td>
    </tr>
  );
}

function Section({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
        {title.replace(/([A-Z])/g, " $1").trim()}
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-3 py-1">Name</th>
            <th className="px-3 py-1 text-right">Price</th>
            <th className="px-3 py-1 text-right">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, i) => <QuoteRow key={i} item={item} />)}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketOverview({ keys }: Props) {
  const [data, setData] = useState<{ data: Record<string, any>; missing: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/bootstrap", { keys })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const sections = keys.split(",").map((k) => k.trim());
  const bootstrapData = data?.data ?? {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Market Overview
      </div>
      <div className="overflow-y-auto flex-1">
        {sections.map((key) => {
          const sectionData = bootstrapData[key];
          if (!sectionData) return null;
          const items = Array.isArray(sectionData) ? sectionData : sectionData?.items ?? sectionData?.quotes ?? [];
          if (!Array.isArray(items) || items.length === 0) return null;
          return <Section key={key} title={key} items={items} />;
        })}
        {data?.missing && data.missing.length > 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Missing: {data.missing.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
