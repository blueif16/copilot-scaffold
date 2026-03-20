"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  filter_codes?: string;
  min_magnitude?: number;
  widgetId?: string;
}

function magColor(mag: number): string {
  if (mag >= 7) return "text-red-400 bg-red-500/20";
  if (mag >= 5) return "text-orange-400 bg-orange-500/20";
  if (mag >= 3) return "text-amber-400 bg-amber-500/20";
  return "text-emerald-400 bg-emerald-500/20";
}

export default function Earthquakes({ filter_codes, min_magnitude }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/bootstrap", { keys: "earthquakes" })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  let items = Array.isArray(data?.earthquakes) ? data.earthquakes
    : Array.isArray(data?.data?.earthquakes) ? data.data.earthquakes
    : Array.isArray(data) ? data : [];

  if (filter_codes) {
    const codes = filter_codes.split(",").map((c) => c.trim().toUpperCase());
    items = items.filter((e: any) => codes.includes((e.code ?? e.country_code ?? "").toUpperCase()));
  }

  if (min_magnitude && min_magnitude > 0) {
    items = items.filter((e: any) => (e.magnitude ?? e.mag ?? 0) >= min_magnitude);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Earthquakes {min_magnitude ? `M${min_magnitude}+` : ""} {filter_codes ? `— ${filter_codes}` : ""}
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Mag</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2 text-right">Depth</th>
              <th className="px-3 py-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No earthquakes found</td></tr>
            )}
            {items.map((e: any, i: number) => {
              const mag = e.magnitude ?? e.mag ?? 0;
              return (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-3 py-2">
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${magColor(mag)}`}>
                      {typeof mag === "number" ? mag.toFixed(1) : mag}
                    </span>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[200px]">
                    {e.location ?? e.place ?? e.title ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {e.depth != null ? `${e.depth}km` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {e.time ? new Date(e.time).toLocaleString() : e.date ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
