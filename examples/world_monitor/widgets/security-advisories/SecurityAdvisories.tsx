"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  filter_codes?: string;
  widgetId?: string;
}

function threatColor(level: string): string {
  const l = (level ?? "").toLowerCase();
  if (l.includes("critical") || l.includes("extreme")) return "bg-red-500/20 text-red-400";
  if (l.includes("high") || l.includes("severe")) return "bg-orange-500/20 text-orange-400";
  if (l.includes("medium") || l.includes("moderate")) return "bg-amber-500/20 text-amber-400";
  return "bg-emerald-500/20 text-emerald-400";
}

export default function SecurityAdvisories({ filter_codes }: Props) {
  const [data, setData] = useState<{ data: Record<string, any> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/bootstrap", { keys: "securityAdvisories" })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  let items: any[] = [];
  const advisories = data?.data?.securityAdvisories;
  if (Array.isArray(advisories)) {
    items = advisories;
  }

  if (filter_codes) {
    const codes = filter_codes.split(",").map((c) => c.trim().toUpperCase());
    items = items.filter((a: any) => codes.includes((a.code ?? a.countryCode ?? "").toUpperCase()));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Security Advisories {filter_codes ? `— ${filter_codes}` : ""}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No advisories found</div>
        )}
        {items.map((a: any, i: number) => (
          <div key={i} className="px-3 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{a.country ?? a.name ?? a.code ?? "—"}</span>
              {(a.threatLevel ?? a.level ?? a.severity) && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${threatColor(a.threatLevel ?? a.level ?? a.severity)}`}>
                  {a.threatLevel ?? a.level ?? a.severity}
                </span>
              )}
            </div>
            {(a.description ?? a.advisory ?? a.text) && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {a.description ?? a.advisory ?? a.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
