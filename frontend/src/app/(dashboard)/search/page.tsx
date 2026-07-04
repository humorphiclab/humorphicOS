"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchApi } from "@/lib/api";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebounced(val), 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi.query(debounced),
    enabled: debounced.length >= 2,
  });

  return (
    <>
      <TopBar title="Global Search" />
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            className="pl-10"
            placeholder="Search members, tasks, projects, knowledge..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
        </div>

        {isLoading && <p className="text-muted text-sm">Searching...</p>}
        {data && (
          <Card>
            <p className="text-sm text-muted mb-3">{data.count} result(s) for &quot;{data.query}&quot;</p>
            <ul className="space-y-2">
              {data.results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link href={r.url} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-card-border/30 transition-colors">
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-primary/15 text-primary">{r.type}</span>
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted">{r.subtitle}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
