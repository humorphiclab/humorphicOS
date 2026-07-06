"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { teamsApi } from "@/lib/api";

export default function TeamsPage() {
  const { data: teams, isLoading } = useQuery({ queryKey: ["teams"], queryFn: teamsApi.list });

  return (
    <>
      <TopBar title="Teams" />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : (teams ?? []).map((t) => (
          <Card key={t.id}>
            <p className="font-semibold">{t.name}</p>
            <p className="text-xs text-primary mt-1">{t.project_detail?.title}</p>
            <p className="text-sm text-muted mt-2">{t.member_count ?? 0} members</p>
          </Card>
        ))}
      </div>
    </>
  );
}
