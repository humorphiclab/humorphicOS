"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card, StatCard } from "@/components/ui/card";
import { analyticsApi } from "@/lib/api";
import { Users, ClipboardList, CheckSquare, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: analyticsApi.dashboard });
  const { data: trends } = useQuery({ queryKey: ["trends"], queryFn: analyticsApi.trends });

  if (isLoading) return <><TopBar title="Analytics" /><div className="p-6 text-muted">Loading...</div></>;

  return (
    <>
      <TopBar title="Analytics Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Members" value={data?.members ?? 0} icon={<Users className="h-5 w-5" />} accent="primary" />
          <StatCard title="Updates This Week" value={data?.daily_updates_this_week ?? 0} icon={<ClipboardList className="h-5 w-5" />} accent="accent" />
          <StatCard title="Attendance Rate" value={`${data?.attendance_rate ?? 0}%`} icon={<CheckSquare className="h-5 w-5" />} accent="success" />
          <StatCard title="Avg Task Hours" value={data?.avg_task_hours?.toFixed(1) ?? "0"} icon={<TrendingUp className="h-5 w-5" />} accent="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-4">Tasks by Status</h3>
            <div className="space-y-2">
              {data?.tasks_by_status?.map((t) => (
                <div key={t.status} className="flex justify-between text-sm">
                  <span className="capitalize text-muted">{t.status.replace("_", " ")}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Projects by Health</h3>
            <div className="space-y-2">
              {data?.projects_by_health?.map((p) => (
                <div key={p.health} className="flex justify-between text-sm">
                  <span className="capitalize text-muted">{p.health.replace("_", " ")}</span>
                  <span className="font-medium">{p.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Department Stats</h3>
            <div className="space-y-2">
              {data?.department_stats?.map((d) => (
                <div key={d.name} className="flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-muted">{d.teams} teams · {d.projects} projects</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">7-Day Trends</h3>
            <div className="space-y-2">
              {trends?.trends?.map((t) => (
                <div key={t.date} className="flex justify-between text-sm">
                  <span className="text-muted">{t.date}</span>
                  <span>{t.updates} updates · {t.tasks_completed} tasks done</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
