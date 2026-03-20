"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface UcdpEvent {
  id: string;
  dateStart: number;
  dateEnd: number;
  country: string;
  sideA: string;
  sideB: string;
  deathsBest: number;
  deathsLow: number;
  deathsHigh: number;
  violenceType: string;
  sourceOriginal: string;
}

interface Props {
  country?: string;
  page_size?: number;
  widgetId?: string;
}

export default function UcdpEvents({ country, page_size }: Props) {
  const [data, setData] = useState<{ events: UcdpEvent[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/conflict/v1/list-ucdp-events", { country, page_size })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  const events = data?.events ?? [];

  const violenceLabel = (t: string) => {
    if (t.includes("STATE_BASED")) return "State-based";
    if (t.includes("NON_STATE")) return "Non-state";
    if (t.includes("ONE_SIDED")) return "One-sided";
    return t.replace("UCDP_VIOLENCE_TYPE_", "");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        UCDP Events {country ? `— ${country}` : "— Global"}
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Side A</th>
              <th className="px-3 py-2">Side B</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Deaths</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No events found</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-muted/50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(e.dateStart * 1000).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">{e.country}</td>
                <td className="px-3 py-2 truncate max-w-[120px]">{e.sideA}</td>
                <td className="px-3 py-2 truncate max-w-[120px]">{e.sideB}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="bg-muted px-1.5 py-0.5 rounded">{violenceLabel(e.violenceType)}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={e.deathsBest > 0 ? "text-red-400" : "text-muted-foreground"}>
                    {e.deathsBest}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
