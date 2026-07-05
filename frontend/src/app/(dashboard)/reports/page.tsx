"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportsApi } from "@/lib/api";
import { FileText, Download } from "lucide-react";

const reportTypes = [
  { type: "Daily Report", key: "daily", description: "Summary of today's work across all members" },
  { type: "Weekly Report", key: "weekly", description: "Weekly task completion and update compliance" },
  { type: "Attendance Report", key: "attendance", description: "Meeting and session attendance analytics" },
  { type: "Project Report", key: "project", description: "Project health and milestone progress" },
  { type: "Performance Report", key: "performance", description: "Member performance trends and metrics" },
];

export default function ReportsPage() {
  const qc = useQueryClient();
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list });
  const { data: summary } = useQuery({ queryKey: ["leadership-summary"], queryFn: reportsApi.leadershipSummary });

  const generateDaily = useMutation({
    mutationFn: reportsApi.generateDaily,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const generateWeekly = useMutation({
    mutationFn: reportsApi.generateWeekly,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  return (
    <>
      <TopBar title="Reports" />
      <div className="p-6 space-y-6">
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><p className="text-sm text-muted">Total Tasks</p><p className="text-2xl font-bold">{(summary.tasks as {total?: number})?.total ?? 0}</p></Card>
            <Card><p className="text-sm text-muted">Completed</p><p className="text-2xl font-bold text-success">{(summary.tasks as {completed?: number})?.completed ?? 0}</p></Card>
            <Card><p className="text-sm text-muted">Daily Updates Today</p><p className="text-2xl font-bold">{(summary.daily_updates_today as number) ?? 0}</p></Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map(({ type, key, description }) => (
            <Card key={type}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <h3 className="font-medium">{type}</h3>
                  <p className="text-sm text-muted mt-1">{description}</p>
                  {key === "daily" && (
                    <Button variant="secondary" size="sm" className="mt-3 gap-1.5" onClick={() => generateDaily.mutate()} disabled={generateDaily.isPending}>
                      <Download className="h-3.5 w-3.5" /> Generate
                    </Button>
                  )}
                  {key === "weekly" && (
                    <Button variant="secondary" size="sm" className="mt-3 gap-1.5" onClick={() => generateWeekly.mutate()} disabled={generateWeekly.isPending}>
                      <Download className="h-3.5 w-3.5" /> Generate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {(reports ?? []).length > 0 && (
          <Card>
            <h3 className="font-semibold mb-4">Generated Reports</h3>
            <ul className="space-y-2">
              {reports!.map((r) => (
                <li key={r.id} className="flex justify-between items-center text-sm border-b border-card-border pb-2">
                  <span>{r.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted capitalize">{r.report_type}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `report-${r.id}.json`;
                        a.click();
                      }}
                    >
                      Export
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
