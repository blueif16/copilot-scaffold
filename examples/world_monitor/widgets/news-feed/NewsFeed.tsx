"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/fetchApi";

interface Props {
  category: string;
  keyword?: string;
  lang?: string;
  widgetId?: string;
}

export default function NewsFeed({ category, keyword, lang }: Props) {
  const [data, setData] = useState<any>(null);
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

  let articles = Array.isArray(data) ? data : data?.results ?? data?.data ?? data?.articles ?? data?.items ?? [];

  // Client-side keyword filter
  if (keyword) {
    const kw = keyword.toLowerCase();
    articles = articles.filter((a: any) =>
      (a.title ?? "").toLowerCase().includes(kw) ||
      (a.description ?? a.summary ?? "").toLowerCase().includes(kw)
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
        News — {category} {keyword ? `(${keyword})` : ""}
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {articles.length === 0 && (
          <div className="px-3 py-6 text-center text-muted-foreground">No articles found</div>
        )}
        {articles.map((a: any, i: number) => (
          <div key={i} className="px-3 py-3 hover:bg-muted/50">
            <a
              href={a.url ?? a.link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {a.title ?? "Untitled"}
            </a>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {a.source && <span>{typeof a.source === "string" ? a.source : a.source.name ?? a.source}</span>}
              {(a.publishedAt ?? a.date ?? a.published) && (
                <span>{new Date(a.publishedAt ?? a.date ?? a.published).toLocaleDateString()}</span>
              )}
            </div>
            {(a.description ?? a.summary) && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {a.description ?? a.summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
