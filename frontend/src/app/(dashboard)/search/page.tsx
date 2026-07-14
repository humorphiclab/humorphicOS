"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { searchApi } from "@/lib/api";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi.query(debounced),
    enabled: debounced.length >= 2,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {isLoading && <p className="text-muted text-sm animate-pulse">Searching...</p>}
      
      {!query && (
        <div className="text-center py-12 text-muted">
          <p className="text-lg font-medium">Global Search</p>
          <p className="text-sm mt-1">Start typing in the top bar to search members, tasks, projects, and articles.</p>
        </div>
      )}

      {query && query.length < 2 && (
        <p className="text-xs text-muted">Please enter at least 2 characters to search.</p>
      )}

      {data && (
        <Card className="p-5 border-card-border bg-card/50 backdrop-blur">
          <p className="text-sm text-muted mb-4">
            {data.count} result(s) found for &quot;<span className="font-semibold text-foreground">{data.query}</span>&quot;
          </p>
          {data.results.length === 0 ? (
            <p className="text-sm text-muted py-4">No results match your search query.</p>
          ) : (
            <ul className="divide-y divide-card-border/40">
              {data.results.map((r) => (
                <li key={`${r.type}-${r.id}`} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={r.url} className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-card-border/30 hover:text-primary transition-all duration-200">
                    <span className="text-[10px] tracking-wider uppercase font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary shrink-0 border border-primary/15">
                      {r.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-foreground">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-muted truncate mt-0.5">{r.subtitle}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <TopBar title="Global Search" />
      <Suspense fallback={
        <div className="p-6 max-w-4xl mx-auto text-center py-12 text-muted">
          <p className="text-sm animate-pulse">Loading search platform...</p>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </>
  );
}
