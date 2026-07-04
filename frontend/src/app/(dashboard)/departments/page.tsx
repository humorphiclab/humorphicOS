"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { departmentsApi } from "@/lib/api";

export default function DepartmentsPage() {
  const { data: depts, isLoading } = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list });

  return (
    <>
      <TopBar title="Departments" />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : (depts ?? []).map((d) => (
          <Card key={d.id}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: d.color }}>
                {d.name[0]}
              </div>
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-muted">{d.member_count ?? 0} members</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
