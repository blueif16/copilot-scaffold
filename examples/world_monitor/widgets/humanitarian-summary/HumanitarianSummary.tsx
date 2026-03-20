"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  country_code: string;
  widgetId?: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function HumanitarianSummary({ country_code }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/conflict/v1/get-humanitarian-summary", { country_code })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const d = data?.data ?? data?.result ?? data ?? {};

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Humanitarian Summary — {country_code}
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 flex-1">
        {d.idps != null && <StatCard label="Internally Displaced" value={d.idps} />}
        {d.refugees != null && <StatCard label="Refugees" value={d.refugees} />}
        {d.food_insecurity != null && <StatCard label="Food Insecure" value={d.food_insecurity} />}
        {d.people_in_need != null && <StatCard label="People in Need" value={d.people_in_need} />}
        {d.population != null && <StatCard label="Population" value={d.population} />}
        {d.crisis_level != null && (
          <StatCard label="Crisis Level" value={d.crisis_level} />
        )}
        {/* Fallback: render top-level keys if specific fields not found */}
        {!d.idps && !d.refugees && !d.food_insecurity && Object.entries(d).map(([k, v]) => (
          typeof v === "number" || typeof v === "string" ? (
            <StatCard key={k} label={k.replace(/_/g, " ")} value={v as string | number} />
          ) : null
        ))}
      </div>
    </div>
  );
}
