"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { knowledgeApi } from "@/lib/api";
import { BookOpen } from "lucide-react";

export default function KnowledgePage() {
  const { data: articles, isLoading } = useQuery({ queryKey: ["knowledge"], queryFn: knowledgeApi.list });

  return (
    <>
      <TopBar title="Knowledge Base" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !articles?.length ? (
          <Card><p className="text-muted text-center py-8">No articles yet.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted capitalize mt-1">{a.article_type.replace("_", " ")}</p>
                    <p className="text-sm text-muted mt-2 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted mt-2">{a.view_count} views</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
