"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface NewsItem {
  source: string;
  title: string;
  link: string;
  publishedAt: number;
  isAlert: boolean;
  threat?: {
    level: string;
    category: string;
    confidence: number;
  };
  locationName: string;
}

interface FeedResponse {
  categories: Record<string, { items: NewsItem[] }>;
  generatedAt: string;
}

interface Props {
  category: string;
  keyword?: string;
  lang?: string;
  widgetId?: string;
}

function threatBadge(level: string): string {
  if (level.includes("CRITICAL")) return "bg-red-500/20 text-red-400";
  if (level.includes("HIGH")) return "bg-orange-500/20 text-orange-400";
  if (level.includes("MEDIUM")) return "bg-amber-500/20 text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default function NewsFeed({ category, keyword, lang }: Props) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/news/v1/list-feed-digest", { variant: "full", lang, category })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-muted rounded m-2" />;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

  // Extract articles from the matching category bucket, or flatten all
  let articles: NewsItem[] = [];
  if (data?.categories) {
    const bucket = data.categories[category];
    if (bucket) {
      articles = bucket.items ?? [];
    } else {
      // Try to find a close match or flatten all categories
      articles = Object.values(data.categories).flatMap((b) => b.items ?? []);
    }
  }

  // Client-side keyword filter
  if (keyword) {
    const kw = keyword.toLowerCase();
    articles = articles.filter((a) =>
      a.title.toLowerCase().includes(kw) || a.source.toLowerCase().includes(kw)
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
        <span>News — {category} {keyword ? `(${keyword})` : ""}</span>
        <span className="text-[10px] opacity-60">{articles.length} articles</span>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {articles.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No articles found</div>
        )}
        {articles.map((a, i) => (
          <div key={i} className="px-3 py-3 hover:bg-muted/50">
            <div className="flex items-start gap-2">
              <a
                href={a.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline flex-1"
              >
                {a.isAlert && <span className="text-red-400 mr-1">!</span>}
                {a.title}
              </a>
              {a.threat && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${threatBadge(a.threat.level)}`}>
                  {a.threat.level.replace("THREAT_LEVEL_", "")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{a.source}</span>
              {a.publishedAt > 0 && (
                <span>{new Date(a.publishedAt * 1000).toLocaleDateString()}</span>
              )}
              {a.locationName && <span>{a.locationName}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
