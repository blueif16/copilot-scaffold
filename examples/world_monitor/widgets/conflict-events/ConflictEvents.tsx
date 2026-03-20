"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  country?: string;
  page_size?: number;
  widgetId?: string;
}

export default function ConflictEvents({ country, page_size }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/conflict/v1/list-acled-events", { country, page_size })
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
        ACLED Conflict Events {country ? `— ${country}` : "— Global"}
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Fatalities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No events found</td></tr>
            )}
            {events.map((e: any, i: number) => (
              <tr key={i} className="hover:bg-muted/50">
                <td className="px-3 py-2 whitespace-nowrap">{e.event_date ?? e.date ?? "—"}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{e.location ?? e.admin1 ?? e.country ?? "—"}</td>
                <td className="px-3 py-2 truncate max-w-[160px]">{e.event_type ?? e.type ?? e.disorder_type ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={(e.fatalities ?? 0) > 0 ? "text-red-400" : "text-muted-foreground"}>
                    {e.fatalities ?? 0}
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
