"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  filter_codes?: string;
  widgetId?: string;
}

function riskColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-amber-400";
  return "text-emerald-400";
}

function riskBg(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function CountryRisk({ filter_codes }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/bootstrap", { keys: "riskScores" })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  let items = Array.isArray(data?.riskScores) ? data.riskScores
    : Array.isArray(data?.data?.riskScores) ? data.data.riskScores
    : Array.isArray(data) ? data : [];

  if (filter_codes) {
    const codes = filter_codes.split(",").map((c) => c.trim().toUpperCase());
    items = items.filter((r: any) => codes.includes((r.code ?? r.country_code ?? "").toUpperCase()));
  }

  items.sort((a: any, b: any) => (b.score ?? b.risk_score ?? 0) - (a.score ?? a.risk_score ?? 0));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Country Risk {filter_codes ? `— ${filter_codes}` : ""}
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2 w-32">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No risk data</td></tr>
            )}
            {items.map((r: any, i: number) => {
              const score = r.score ?? r.risk_score ?? 0;
              return (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-3 py-2">{r.country ?? r.name ?? r.code ?? "—"}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${riskColor(score)}`}>{score}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${riskBg(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
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
