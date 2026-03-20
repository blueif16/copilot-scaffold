"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface HumanitarianData {
  countryCode: string;
  countryName: string;
  conflictEventsTotal: number;
  conflictPoliticalViolenceEvents: number;
  conflictFatalities: number;
  referencePeriod: string;
  conflictDemonstrations: number;
  updatedAt: number;
}

interface Props {
  country_code: string;
  widgetId?: string;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color ?? ""}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export default function HumanitarianSummary({ country_code }: Props) {
  const [data, setData] = useState<{ summary?: HumanitarianData } | null>(null);
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

  const d = data?.summary;
  if (!d) return <div className="p-4 text-muted-foreground text-sm">No humanitarian data available for {country_code}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
        <span>Humanitarian — {d.countryName || country_code}</span>
        {d.referencePeriod && <span className="text-[10px] opacity-60">{d.referencePeriod}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 flex-1">
        <StatCard label="Total Conflict Events" value={d.conflictEventsTotal} />
        <StatCard label="Fatalities" value={d.conflictFatalities} color="text-red-400" />
        <StatCard label="Political Violence" value={d.conflictPoliticalViolenceEvents} color="text-orange-400" />
        <StatCard label="Demonstrations" value={d.conflictDemonstrations} />
      </div>
      {d.updatedAt > 0 && (
        <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
          Updated: {new Date(d.updatedAt * 1000).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
